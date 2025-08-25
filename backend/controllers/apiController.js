const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Category = require('../models/Category');
const Document = require('../models/Document');
const OrganigramNode = require('../models/OrganigramNode');
const User = require('../models/User');
const GlobalSettings = require('../models/GlobalSettings');
const Role = require('../models/Role');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const { generateReference } = require('../utils/referenceGenerator');

// ----- Permission helpers -----
async function getUserFromReq(req) {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) return null;
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).populate({
      path: 'roles',
      populate: [{ path: 'organigramNodes.node' }, { path: 'archiveCategories.category' }]
    });
    return user;
  } catch (_) {
    return null;
  }
}

function hasCrudOnNode(user, nodeId) {
  if (!user) return false;
  if (user.roles?.some(r => r.name === 'admin')) return true;
  const ids = user.roles.flatMap(r => (r.organigramNodes || []).filter(n => n.permissions === 'crud').map(n => (n.node?._id?.toString?.() || n.node?.toString?.() || n.node)));
  return ids.includes(nodeId.toString());
}

function hasCrudOnCategory(user, categoryId) {
  if (!user) return false;
  if (user.roles?.some(r => r.name === 'admin')) return true;
  const ids = user.roles.flatMap(r => (r.archiveCategories || []).filter(c => c.permissions === 'crud').map(c => (c.category?._id?.toString?.() || c.category?.toString?.() || c.category)));
  return ids.includes(categoryId.toString());
}

// Helper function to get documents for a category
async function getDocumentsForCategory(categoryId) {
  try {
    const documents = await Document.find({ category: categoryId })
      .sort({ createdAt: -1 })
      .limit(10); // Limit to 10 most recent documents per category
    return documents;
  } catch (e) {
    console.error(`[getDocumentsForCategory] Error for category ${categoryId}:`, e);
    return [];
  }
}

// Helper: get full path for a category (async)
async function getCategoryFullPath(categoryId) {
  let names = [];
  let current = await Category.findById(categoryId);
  while (current) {
    names.unshift(current.name);
    if (!current.parent) break;
    current = await Category.findById(current.parent);
  }
  return names.join('/');
}

// Helper: get next code for a category path & year
async function getNextDocumentCode(categoryId, year) {
  const path = await getCategoryFullPath(categoryId);
  const regex = new RegExp(`^${path}/${year}/(\\d{4})$`);
  const docs = await Document.find({
    referencePath: { $regex: `^${path}/${year}/` }
  }).sort({ code: -1 }).limit(1);
  if (docs.length > 0) {
    const lastCode = parseInt(docs[0].code, 10);
    return String(lastCode + 1).padStart(4, '0');
  }
  return '0001';
}

// --- LOGIN ENDPOINT (NEW, SECURE) ---
exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username }).populate('roles');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Generate JWT
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '12h' });
    // Return user object with roles (excluding password)
    const userObj = user.toObject();
    delete userObj.password;
    return res.json({
      ...userObj,
      token
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

// --- AUTH MIDDLEWARE (NEW) ---
exports.authMiddleware = (roles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};

// --- GET CURRENT USER (NEW) ---
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('roles');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// --- REGISTER USER (RESPECT ROLES) ---
exports.register = async (req, res) => {
  const { username, password, role, roles } = req.body;
  try {
    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: 'Username already exists' });
    let roleIds = [];
    if (Array.isArray(roles) && roles.length) {
      roleIds = roles.map(r => (typeof r === 'object' && r._id ? r._id : r));
    } else if (role) {
      roleIds = [typeof role === 'object' && role._id ? role._id : role];
    }
    const user = new User({ username, password, roles: roleIds });
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getOrganigram = async (req, res) => {
  // Return all categories and their documents
  const categories = await Category.find();
  const result = [];
  for (const cat of categories) {
    const docs = await Document.find({ category: cat._id });
    result.push({ category: cat.name, documents: docs });
  }
  res.json(result);
};

exports.updateOrganigram = async (req, res) => {
  const { documentId, data } = req.body;
  const doc = await Document.findById(documentId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  doc.completed = true;
  doc.data = data;
  await doc.save();
  res.json(doc);
};

exports.getOrganigramProgress = async (req, res) => {
  const total = await Document.countDocuments();
  const completed = await Document.countDocuments({ completed: true });
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  res.json({ total, completed, percent });
};

// DEPRECATED: getMissingDocuments should not be used for organigram tree
// Use getOrganigramMissingNodes instead
exports.getMissingDocuments = async (req, res) => {
  res.status(410).json({ error: 'This endpoint is deprecated. Use /api/organigram/missing for missing documents in the organigram tree.' });
};

// --- CATEGORY CREATE (with permission check + propagation) ---
exports.createCategory = async (req, res) => {
  const { name, parent, reference } = req.body;
  try {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    // If has parent, require CRUD on parent category for non-admins
    if (parent && !hasCrudOnCategory(user, parent)) {
      const isAdmin = user.roles?.some(r => r.name === 'admin');
      if (!isAdmin) return res.status(403).json({ error: 'Forbidden: no CRUD rights on parent category' });
    }
    const cat = new Category({ 
      name, 
      parent: parent || null, 
      reference,
      updatedAt: new Date()
    });
    await cat.save();

    // --- Permission propagation logic ---
    if (parent) {
      // For each role with CRUD or view on parent, propagate same right to new subcategory
      const roles = await Role.find({ 'archiveCategories.category': parent });
      for (const role of roles) {
        // Find all parent permissions for this role
        const parentPerms = role.archiveCategories.filter(c => c.category.toString() === parent.toString());
        let changed = false;
        for (const perm of parentPerms) {
          // Only propagate if not already present
          const exists = role.archiveCategories.some(c => c.category.toString() === cat._id.toString() && c.permissions === perm.permissions);
          if (!exists) {
            role.archiveCategories.push({ category: cat._id, permissions: perm.permissions });
            changed = true;
          }
        }
        if (changed) await role.save();
      }
    }
    res.json(cat);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.addDocumentToCategory = async (req, res) => {
  try {
    const { category, name, reference, fileUrls } = req.body;
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    if (!hasCrudOnCategory(user, category)) {
      const isAdmin = user.roles?.some(r => r.name === 'admin');
      if (!isAdmin) return res.status(403).json({ error: 'Forbidden: no CRUD rights on category' });
    }
    const year = new Date().getFullYear();
    
    // Use the reference provided by the frontend
    const referencePath = reference || ''; // Fallback to empty string if not provided
    
    // Extract code from reference path (last 4 digits)
    const codeMatch = referencePath.match(/(\d{4})$/);
    const code = codeMatch ? codeMatch[1] : '0001';
    
    const doc = new Document({
      category,
      year,
      code,
      referencePath,
      name,
      reference: referencePath, // Store the full reference
      files: fileUrls || []
    });
    await doc.save();
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    let user = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await User.findById(decoded.id).populate({
          path: 'roles',
          populate: { path: 'archiveCategories.category' }
        });
      } catch (e) {}
    }
    let categories;
    if (user && user.roles && user.roles.length && !user.roles.some(r => r.name === 'admin')) {
      const allowedCatIds = user.roles.flatMap(r => (r.archiveCategories || []).map(c => {
        if (c.category && typeof c.category === 'object' && c.category._id) return c.category._id.toString();
        return c.category ? c.category.toString() : null;
      })).filter(Boolean);
      const uniqueCatIds = [...new Set(allowedCatIds)];
      categories = await Category.find({ _id: { $in: uniqueCatIds } }).sort({ name: 1 });
      console.log('[getAllCategories] User:', user.username, '| Allowed categories:', uniqueCatIds);
    } else {
      categories = await Category.find().sort({ name: 1 });
      if (user) {
        console.log('[getAllCategories] Admin user:', user.username, '| All categories returned');
      } else {
        console.log('[getAllCategories] Unauthenticated request | All categories returned');
      }
    }
    res.json(categories);
  } catch (e) {
    console.error('[getAllCategories] Error:', e);
    res.status(500).json({ error: e.message });
  }
};

// --- GET DOCUMENTS BY CATEGORY (with pagination and filters) ---
exports.getDocumentsByCategory = async (req, res) => {
  try {
    const { category, categories, page = 1, pageSize = 10, ...filters } = req.query;
    // Authorization: require user and filter by allowed categories unless admin
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const isAdmin = user.roles?.some(r => r.name === 'admin');

    // Build category constraint from query params
    let requestedCats = [];
    if (categories) {
      if (Array.isArray(categories)) {
        requestedCats = categories;
      } else if (typeof categories === 'string') {
        requestedCats = [categories];
      }
    } else if (category) {
      requestedCats = [category];
    }

    // Determine allowed categories for non-admins
    let categoryConstraint = {};
    if (!isAdmin) {
      const allowedCats = user.roles
        .flatMap(r => (r.archiveCategories || [])
          .map(c => (c.category?._id?.toString?.() || c.category?.toString?.() || c.category)))
        .filter(Boolean);
      const uniqueAllowed = [...new Set(allowedCats)];
      if (requestedCats.length) {
        // Intersect requested with allowed
        const reqSet = new Set(requestedCats.map(String));
        const intersection = uniqueAllowed.filter(id => reqSet.has(String(id)));
        categoryConstraint = { category: { $in: intersection.length ? intersection : ['__none__'] } };
      } else {
        categoryConstraint = { category: { $in: uniqueAllowed.length ? uniqueAllowed : ['__none__'] } };
      }
    } else {
      if (requestedCats.length) categoryConstraint = { category: { $in: requestedCats } };
    }

    // Apply filters (e.g., name, reference, createdAt)
    const query = { ...categoryConstraint };
    if (filters.name) query.name = { $regex: filters.name, $options: 'i' };
    if (filters.reference) query.reference = { $regex: filters.reference, $options: 'i' };
    if (filters.createdAt) query.createdAt = { $gte: new Date(filters.createdAt) };

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const total = await Document.countDocuments(query);
    const documents = await Document.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(pageSize));
    res.json({ data: documents, total, page: parseInt(page), pageSize: parseInt(pageSize) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// DELETE /api/documents/:documentId
exports.deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const doc = await Document.findById(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (!hasCrudOnCategory(user, doc.category)) {
      const isAdmin = user.roles?.some(r => r.name === 'admin');
      if (!isAdmin) return res.status(403).json({ error: 'Forbidden: no CRUD rights on category' });
    }
    await Document.findByIdAndDelete(documentId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// --- DOCUMENT UPDATE ---
exports.updateDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const updates = req.body;
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!hasCrudOnCategory(user, doc.category)) {
      const isAdmin = user.roles?.some(r => r.name === 'admin');
      if (!isAdmin) return res.status(403).json({ error: 'Forbidden: no CRUD rights on category' });
    }
    // Only allow updating name and reference (add more fields as needed)
    if (updates.name !== undefined) doc.name = updates.name;
    if (updates.reference !== undefined) doc.referencePath = updates.reference;
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// --- OrganigramNode CRUD and logic ---
// Create a new node (with permission check + inheritance)
exports.createOrganigramNode = async (req, res) => {
  try {
    const { name, parent, type } = req.body;
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    if (parent) {
      if (!hasCrudOnNode(user, parent)) {
        const isAdmin = user.roles?.some(r => r.name === 'admin');
        if (!isAdmin) return res.status(403).json({ error: 'Forbidden: no CRUD rights on parent node' });
      }
    } else {
      // Creating a root node is admin-only
      const isAdmin = user.roles?.some(r => r.name === 'admin');
      if (!isAdmin) return res.status(403).json({ error: 'Forbidden: only admins can create root nodes' });
    }
    const node = new OrganigramNode({ name, parent: parent || null, type });
    await node.save();
    // Inherit CRUD permission from parent for all roles that have CRUD on parent
    if (parent) {
      const rolesWithCrud = await Role.find({ 'organigramNodes.node': parent, 'organigramNodes.permissions': 'crud' });
      for (const role of rolesWithCrud) {
        const already = (role.organigramNodes || []).some(n => n.node?.toString() === node._id.toString());
        if (!already) {
          role.organigramNodes.push({ node: node._id, permissions: 'crud' });
          await role.save();
        }
      }
    }
    res.json(node);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get full organigram as a tree, filtered by user rights
exports.getOrganigramTree = async (req, res) => {
  try {
    let user = null;
    let isAdmin = false;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await User.findById(decoded.id).populate({
          path: 'roles',
          populate: { path: 'organigramNodes.node' }
        });
        isAdmin = user && user.roles && user.roles.some(r => r.name === 'admin');
      } catch (e) { user = null; }
    }
    
    // Build query with versions and updatedBy populated
    let query = OrganigramNode.find()
      .populate('versions.uploadedBy', 'username email')
      .populate('updatedBy', 'username email') // Add this line to populate updatedBy
      .sort({ 'versions.uploadedAt': -1 }); // Sort versions by upload date (newest first)
    
    let nodes;
    if (isAdmin) {
      // Admin: always return all nodes
      nodes = await query;
    } else if (user && user.roles && user.roles.length) {
      // Collect allowed node IDs for view or crud
      const allowedNodeIds = user.roles.flatMap(r => (r.organigramNodes || []).map(n => {
        if (n.permissions === 'view' || n.permissions === 'crud') {
          if (n.node && typeof n.node === 'object' && n.node._id) return n.node._id.toString();
          return n.node ? n.node.toString() : null;
        }
        return null;
      })).filter(Boolean);
      nodes = await query.find({ _id: { $in: allowedNodeIds } });
    } else {
      // Unauthenticated: return nothing
      nodes = [];
    }
    
    // Convert flat list to tree
    const nodeMap = {};
    nodes.forEach(n => {
      // Convert to plain object and ensure versions is an array
      const nodeObj = n.toObject ? n.toObject() : n;
      nodeObj.children = [];
      nodeMap[n._id] = nodeObj;
    });
    
    const tree = [];
    nodes.forEach(n => {
      if (n.parent && nodeMap[n.parent]) {
        nodeMap[n.parent].children.push(nodeMap[n._id]);
      } else {
        tree.push(nodeMap[n._id]);
      }
    });
    
    res.json(tree);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Get all missing nodes from organigram tree, filtered by user rights
exports.getOrganigramMissingNodes = async (req, res) => {
  try {
    let user = null;
    let isAdmin = false;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await User.findById(decoded.id).populate({
          path: 'roles',
          populate: { path: 'organigramNodes.node' }
        });
        isAdmin = user && user.roles && user.roles.some(r => r.name === 'admin');
      } catch (e) { user = null; }
    }
    let missing;
    if (isAdmin) {
      // Admin: always return all missing nodes
      missing = await OrganigramNode.find({ type: { $in: ["parent_document", "child_document"] }, file: null });
    } else if (user && user.roles && user.roles.length) {
      // Collect allowed node IDs for view or crud
      const allowedNodeIds = user.roles.flatMap(r => (r.organigramNodes || []).map(n => {
        if (n.permissions === 'view' || n.permissions === 'crud') {
          if (n.node && typeof n.node === 'object' && n.node._id) return n.node._id.toString();
          return n.node ? n.node.toString() : null;
        }
        return null;
      })).filter(Boolean);
      missing = await OrganigramNode.find({
        _id: { $in: allowedNodeIds },
        type: { $in: ["parent_document", "child_document"] },
        file: null
      });
    } else {
      // Unauthenticated: return nothing
      missing = [];
    }
    res.json(missing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get completion progress, filtered by user rights
exports.getOrganigramProgressNodes = async (req, res) => {
  try {
    let user = null;
    let isAdmin = false;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await User.findById(decoded.id).populate({
          path: 'roles',
          populate: { path: 'organigramNodes.node' }
        });
        isAdmin = user && user.roles && user.roles.some(r => r.name === 'admin');
      } catch (e) { user = null; }
    }
    let total, completed;
    if (isAdmin) {
      total = await OrganigramNode.countDocuments({ type: { $in: ["parent_document", "child_document"] } });
      completed = await OrganigramNode.countDocuments({ type: { $in: ["parent_document", "child_document"] }, file: { $ne: null } });
    } else if (user && user.roles && user.roles.length) {
      const allowedNodeIds = user.roles.flatMap(r => (r.organigramNodes || []).map(n => {
        if (n.permissions === 'view' || n.permissions === 'crud') {
          if (n.node && typeof n.node === 'object' && n.node._id) return n.node._id.toString();
          return n.node ? n.node.toString() : null;
        }
        return null;
      })).filter(Boolean);
      total = await OrganigramNode.countDocuments({ _id: { $in: allowedNodeIds }, type: { $in: ["parent_document", "child_document"] } });
      completed = await OrganigramNode.countDocuments({ _id: { $in: allowedNodeIds }, type: { $in: ["parent_document", "child_document"] }, file: { $ne: null } });
    } else {
      total = 0;
      completed = 0;
    }
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    res.json({ total, completed, percent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a node (rename, move, reorder, change type)
exports.updateOrganigramNode = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    if (!hasCrudOnNode(user, id)) {
      const isAdmin = user.roles?.some(r => r.name === 'admin');
      if (!isAdmin) return res.status(403).json({ error: 'Forbidden: no CRUD rights on node' });
    }
    // If moving to a new parent, require CRUD on the new parent as well (unless admin)
    if (Object.prototype.hasOwnProperty.call(updates, 'parent')) {
      const newParentId = updates.parent;
      if (newParentId) {
        // Validate new parent exists
        const newParent = await OrganigramNode.findById(newParentId);
        if (!newParent) return res.status(400).json({ error: 'New parent not found' });
        const isAdmin = user.roles?.some(r => r.name === 'admin');
        if (!isAdmin && !hasCrudOnNode(user, newParentId)) {
          return res.status(403).json({ error: 'Forbidden: no CRUD rights on new parent' });
        }
        // Prevent moving node under its own descendant to avoid cycles
        const isDescendant = async (candidateParentId, targetId) => {
          if (!candidateParentId) return false;
          if (String(candidateParentId) === String(targetId)) return true;
          const children = await OrganigramNode.find({ parent: candidateParentId }, '_id');
          for (const child of children) {
            if (await isDescendant(child._id, targetId)) return true;
          }
          return false;
        };
        if (await isDescendant(id, newParentId)) {
          return res.status(400).json({ error: 'Invalid move: cannot move a node under its own descendant' });
        }
      } else {
        // Moving to root: allow if user has CRUD on the node (already checked) or admin
      }
    }
    // support move: parent, order, position, and type changes
    // Add updatedBy and updatedAt to the updates
    updates.updatedBy = req.user ? req.user._id : null;
    updates.updatedAt = new Date();
    
    const node = await OrganigramNode.findByIdAndUpdate(
      id, 
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('updatedBy', 'name email');
    
    if (!node) return res.status(404).json({ error: 'Node not found' });
    res.json(node);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// Delete a node and its children recursively
exports.deleteOrganigramNode = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    if (!hasCrudOnNode(user, id)) {
      const isAdmin = user.roles?.some(r => r.name === 'admin');
      if (!isAdmin) return res.status(403).json({ error: 'Forbidden: no CRUD rights on node' });
    }
    // Recursively delete children
    const deleteRecursively = async nodeId => {
      const children = await OrganigramNode.find({ parent: nodeId });
      for (const child of children) {
        await deleteRecursively(child._id);
      }
      await OrganigramNode.findByIdAndDelete(nodeId);
    };
    await deleteRecursively(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// ----- Public sharing endpoints -----
const crypto = require('crypto');

exports.shareOrganigramNode = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled = true, expiresInHours = 168, password } = req.body; // default 7 days
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    if (!hasCrudOnNode(user, id)) {
      const isAdmin = user.roles?.some(r => r.name === 'admin');
      if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });
    }
    const updates = { shareEnabled: !!enabled };
    if (enabled) {
      updates.shareToken = crypto.randomBytes(16).toString('hex');
      updates.shareExpires = new Date(Date.now() + expiresInHours * 3600 * 1000);
      if (typeof password === 'string' && password.length > 0) {
        const salt = await bcrypt.genSalt(10);
        updates.sharePasswordHash = await bcrypt.hash(password, salt);
      } else {
        updates.sharePasswordHash = null;
      }
    } else {
      updates.shareToken = null;
      updates.shareExpires = null;
      updates.sharePasswordHash = null;
    }
    const node = await OrganigramNode.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!node) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, token: node.shareToken, url: node.shareToken ? `/public/organigram/${node.shareToken}` : null });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.getPublicOrganigramNode = async (req, res) => {
  try {
    const { token } = req.params;
    const node = await OrganigramNode.findOne({ shareToken: token });
    if (!node || !node.shareEnabled) return res.status(404).json({ error: 'Not found' });
    if (node.shareExpires && node.shareExpires < new Date()) return res.status(410).json({ error: 'Link expired' });
    // If password-protected, validate header
    if (node.sharePasswordHash) {
      const provided = req.get('X-Share-Password') || '';
      const ok = await bcrypt.compare(provided, node.sharePasswordHash);
      if (!ok) return res.status(401).json({ error: 'Password required or invalid' });
    }
    // Sanitize response
    const out = node.toObject ? node.toObject() : node;
    delete out.sharePasswordHash;
    delete out.shareToken;
    delete out.shareEnabled;
    delete out.shareExpires;
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.shareDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { enabled = true, expiresInHours = 168, password } = req.body;
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    // Require CRUD on the document's category
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!hasCrudOnCategory(user, doc.category)) {
      const isAdmin = user.roles?.some(r => r.name === 'admin');
      if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });
    }
    const updates = { shareEnabled: !!enabled };
    if (enabled) {
      updates.shareToken = crypto.randomBytes(16).toString('hex');
      updates.shareExpires = new Date(Date.now() + expiresInHours * 3600 * 1000);
      if (typeof password === 'string' && password.length > 0) {
        const salt = await bcrypt.genSalt(10);
        updates.sharePasswordHash = await bcrypt.hash(password, salt);
      } else {
        updates.sharePasswordHash = null;
      }
    } else {
      updates.shareToken = null;
      updates.shareExpires = null;
      updates.sharePasswordHash = null;
    }
    const updated = await Document.findByIdAndUpdate(documentId, { $set: updates }, { new: true });
    res.json({ success: true, token: updated.shareToken, url: updated.shareToken ? `/public/document/${updated.shareToken}` : null });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.getPublicDocument = async (req, res) => {
  try {
    const { token } = req.params;
    const doc = await Document.findOne({ shareToken: token });
    if (!doc || !doc.shareEnabled) return res.status(404).json({ error: 'Not found' });
    if (doc.shareExpires && doc.shareExpires < new Date()) return res.status(410).json({ error: 'Link expired' });
    if (doc.sharePasswordHash) {
      const provided = req.get('X-Share-Password') || '';
      const ok = await bcrypt.compare(provided, doc.sharePasswordHash);
      if (!ok) return res.status(401).json({ error: 'Password required or invalid' });
    }
    const out = doc.toObject ? doc.toObject() : doc;
    delete out.sharePasswordHash;
    delete out.shareToken;
    delete out.shareEnabled;
    delete out.shareExpires;
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// ----- Search endpoints -----
exports.searchOrganigram = async (req, res) => {
  try {
    const { q } = req.query;
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const isAdmin = user.roles?.some(r => r.name === 'admin');
    const filter = q ? { name: { $regex: q, $options: 'i' } } : {};
    if (isAdmin) {
      const nodes = await OrganigramNode.find(filter).limit(50);
      return res.json(nodes);
    }
    const allowed = user.roles.flatMap(r => (r.organigramNodes || []).map(n => (n.node?._id?.toString?.() || n.node?.toString?.() || n.node))).filter(Boolean);
    const nodes = await OrganigramNode.find({ _id: { $in: allowed }, ...filter }).limit(50);
    res.json(nodes);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.searchDocuments = async (req, res) => {
  try {
    const { q } = req.query;
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    const isAdmin = user.roles?.some(r => r.name === 'admin');
    const docFilter = q ? { $or: [ { name: { $regex: q, $options: 'i' } }, { reference: { $regex: q, $options: 'i' } } ] } : {};
    if (isAdmin) {
      const docs = await Document.find(docFilter).limit(50);
      return res.json(docs);
    }
    const allowedCats = user.roles.flatMap(r => (r.archiveCategories || []).map(c => (c.category?._id?.toString?.() || c.category?.toString?.() || c.category))).filter(Boolean);
    const docs = await Document.find({ category: { $in: allowedCats }, ...docFilter }).limit(50);
    res.json(docs);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// Helper function to generate version reference
async function generateVersionReference(node) {
  const versionNumber = node.versions ? node.versions.length + 1 : 1;
  
  // Get reference format from GlobalSettings
  const globalSettings = await GlobalSettings.getSettings();
  const format = {
    sequenceLength: globalSettings.referenceFormat.sequenceLength || 4,
    categoryMode: globalSettings.referenceFormat.categoryMode || 'all',
    separator: globalSettings.referenceFormat.separator || '/',
    pattern: globalSettings.referenceFormat.pattern || ''
  };

  // Get category path for reference
  const getCategoryPath = async (nodeId) => {
    const path = [];
    let current = await OrganigramNode.findById(nodeId);
    while (current) {
      path.unshift(current.name);
      if (!current.parent) break;
      current = await OrganigramNode.findById(current.parent);
    }
    return path;
  };

  const categories = await getCategoryPath(node._id);
  const seq = String(versionNumber).padStart(format.sequenceLength, '0');
  
  if (format.pattern && format.pattern.includes('{')) {
    return format.pattern
      .replace('{seq}', seq)
      .replace('{cat}', categories.join(format.separator))
      .replace('{sep}', format.separator)
      .replace('{year}', new Date().getFullYear())
      .replace('{name}', node.name || '');
  }
  
  return `${seq}${format.separator}${categories.join(format.separator)}`;
}

// Upload file to node (mark as completed)
exports.uploadOrganigramFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileUrl } = req.body;
    const userId = req.user?.id; // Assuming user is attached by auth middleware
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Authorization: require CRUD on node unless admin
    const user = await User.findById(userId).populate('roles');
    const isAdmin = user?.roles?.some(r => r.name === 'admin');
    if (!isAdmin && !hasCrudOnNode(user, id)) {
      return res.status(403).json({ error: 'Forbidden: no CRUD rights on node' });
    }

    const node = await OrganigramNode.findById(id);
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    if (!["parent_document", "child_document"].includes(node.type)) {
      return res.status(400).json({ error: 'Cannot upload file to this node type' });
    }

    // Generate reference for the new version
    const reference = await generateVersionReference(node);
    
    // Create version entry
    const version = {
      reference,
      file: fileUrl,
      uploadedBy: userId,
      uploadedAt: new Date()
    };

    // Update node with new version and current file
    const updatedNode = await OrganigramNode.findByIdAndUpdate(
      id,
      {
        $push: { versions: version },
        $set: {
          file: fileUrl,
          completed: true,
          updatedBy: userId,
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    )
    .populate('versions.uploadedBy', 'name email');
    
    res.json(updatedNode);
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: err.message });
  }
};

// --- CATEGORY UPDATE (name/parent, and update references) ---
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent, reference } = req.body;
    const cat = await Category.findById(id);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    // Update fields
    if (typeof name === 'string') cat.name = name;
    if (typeof parent !== 'undefined') cat.parent = parent;
    if (typeof reference !== 'undefined') cat.reference = reference;
    cat.updatedAt = new Date();
    await cat.save();
    // Update referencePath for all descendant documents
    const updateDescendantReferences = async (categoryId) => {
      const path = await getCategoryFullPath(categoryId);
      const docs = await Document.find({ category: categoryId });
      for (const doc of docs) {
        // Use the new reference generator for updates
        doc.referencePath = await generateReference({ categoryId, year: doc.year, code: doc.code, name: doc.name });
        await doc.save();
      }
      const children = await Category.find({ parent: categoryId });
      for (const child of children) {
        await updateDescendantReferences(child._id);
      }
    };
    await updateDescendantReferences(cat._id);
    res.json(cat);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// --- CATEGORY DELETE (recursive, and docs) ---
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    // Recursively delete children and their docs
    const deleteRecursively = async (categoryId) => {
      const children = await Category.find({ parent: categoryId });
      for (const child of children) {
        await deleteRecursively(child._id);
      }
      await Document.deleteMany({ category: categoryId });
      await Category.findByIdAndDelete(categoryId);
    };
    await deleteRecursively(id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// --- CATEGORY TREE ENDPOINT (INCLUDE ARBORESCENCE FOR SUBCATEGORY RIGHTS) ---
exports.getCategoryTree = async (req, res) => {
  try {
    let user = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await User.findById(decoded.id).populate({
          path: 'roles',
          populate: { path: 'archiveCategories.category' }
        });
      } catch (e) {
        console.error('[getCategoryTree] Error verifying token:', e);
      }
    }
    
    // Get all categories first
    const allCategories = await Category.find().sort({ name: 1 });
    
    // Get all documents and populate the category field
    const allDocuments = await Document.find()
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`[getCategoryTree] Found ${allCategories.length} categories and ${allDocuments.length} documents`);
    
    // Create a map of category ID to its documents
    const documentsByCategory = new Map();
    allDocuments.forEach(doc => {
      if (!doc.category) {
        console.warn('[getCategoryTree] Document has no category:', doc._id);
        return;
      }
      const catId = doc.category.toString();
      if (!documentsByCategory.has(catId)) {
        documentsByCategory.set(catId, []);
      }
      const docObj = { ...doc, _id: doc._id.toString(), category: catId };
      documentsByCategory.get(catId).push(docObj);
    });

    // Create maps for quick lookups
    const idToCategory = new Map();
    const childrenMap = new Map();
    allCategories.forEach(cat => {
      const catId = cat._id.toString();
      idToCategory.set(catId, cat);
      
      // Build children map
      if (cat.parent) {
        const parentId = cat.parent.toString();
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId).push(catId);
      }
    });

    // Function to get all descendant category IDs
    const getAllDescendantIds = (categoryId) => {
      const descendants = [];
      const queue = [categoryId];
      
      while (queue.length > 0) {
        const currentId = queue.shift();
        const children = childrenMap.get(currentId) || [];
        descendants.push(...children);
        queue.push(...children);
      }
      
      return descendants;
    };

    let allowedCatIds = new Set();
    let permissionsMap = {};
    
    if (user && user.roles && user.roles.length && !user.roles.some(r => r.name === 'admin')) {
      // Collect all categories with explicit rights
      user.roles.forEach(role => {
        (role.archiveCategories || []).forEach(c => {
          const catId = c.category?._id?.toString() || c.category?.toString() || c.category;
          if (!catId) return;
          
          // Add this category and all its descendants
          allowedCatIds.add(catId);
          permissionsMap[catId] = c.permissions || 'view';
          
          // Add all descendants with inherited permissions
          const descendants = getAllDescendantIds(catId);
          descendants.forEach(descId => {
            allowedCatIds.add(descId);
            // Only set permission if not already set (higher permissions take precedence)
            if (!permissionsMap[descId]) {
              permissionsMap[descId] = c.permissions || 'view';
            }
          });
        });
      });
      
      // For each allowed category, add all its ancestors (for tree structure)
      const addAncestors = (catId) => {
        let current = idToCategory.get(catId);
        while (current && current.parent) {
          const parentId = current.parent.toString();
          if (!allowedCatIds.has(parentId)) {
            allowedCatIds.add(parentId);
            permissionsMap[parentId] = null; // No direct permissions, just for tree
          }
          current = idToCategory.get(parentId);
        }
      };
      
      // Add ancestors for all explicitly allowed categories
      Array.from(allowedCatIds).forEach(addAncestors);
      
      console.log(`[getCategoryTree] User ${user._id} has access to ${allowedCatIds.size} categories`);
    } else {
      // Admin or unauthenticated: show all categories with admin permissions
      allCategories.forEach(cat => {
        const catId = cat._id.toString();
        permissionsMap[catId] = 'admin';
        allowedCatIds.add(catId);
      });
    }
    
    // For non-admin users, we need to build a tree starting from the top-most accessible nodes
    let tree = [];
    
    if (user && user.roles && user.roles.length && !user.roles.some(r => r.name === 'admin')) {
      // For non-admin users, build a tree starting from explicitly allowed categories
      const explicitlyAllowed = new Set();
      
      // First, find all categories with explicit permissions
      user.roles.forEach(role => {
        (role.archiveCategories || []).forEach(c => {
          const catId = c.category?._id?.toString() || c.category?.toString() || c.category;
          if (catId) explicitlyAllowed.add(catId);
        });
      });
      
      // For each explicitly allowed category, find its top-most ancestor that's also explicitly allowed
      const topLevelNodes = new Set();
      
      const findTopLevelAncestor = (categoryId) => {
        let current = idToCategory.get(categoryId);
        let topLevel = categoryId;
        
        while (current && current.parent) {
          const parentId = current.parent.toString();
          if (explicitlyAllowed.has(parentId)) {
            topLevel = parentId;
          } else if (permissionsMap[parentId] === null) {
            // This is a structural parent, keep looking up
          } else {
            // Found a parent that's not in our allowed set, stop here
            break;
          }
          current = idToCategory.get(parentId);
        }
        
        return topLevel;
      };
      
      // Find all top-level nodes
      explicitlyAllowed.forEach(catId => {
        topLevelNodes.add(findTopLevelAncestor(catId));
      });
      
      // Now build the tree starting from the top-level nodes
      const buildTree = (categoryId) => {
        const category = idToCategory.get(categoryId);
        if (!category) return null;
        
        const catId = category._id.toString();
        const catDocs = documentsByCategory.get(catId) || [];
        
        const node = {
          ...category.toObject(),
          _id: catId,
          permissions: permissionsMap[catId] || 'view', // Default to view if somehow not set
          children: [],
          documents: catDocs
        };
        
        // Add children that are in the allowed set
        const children = childrenMap.get(catId) || [];
        children.forEach(childId => {
          if (allowedCatIds.has(childId)) {
            const childNode = buildTree(childId);
            if (childNode) node.children.push(childNode);
          }
        });
        
        return node;
      };
      
      // Build the tree starting from each top-level node
      topLevelNodes.forEach(topLevelId => {
        const node = buildTree(topLevelId);
        if (node) tree.push(node);
      });
    } else {
      // Admin or unauthenticated: build full tree
      const idMap = {};
      
      // First create all nodes
      allCategories.forEach(cat => {
        const catId = cat._id.toString();
        const catDocs = documentsByCategory.get(catId) || [];
        
        idMap[catId] = { 
          ...cat.toObject(),
          _id: catId,
          permissions: 'admin',
          children: [],
          documents: catDocs
        };
      });
      
      // Then build the tree structure
      allCategories.forEach(cat => {
        const catId = cat._id.toString();
        if (cat.parent && idMap[cat.parent?.toString()]) {
          idMap[cat.parent.toString()].children.push(idMap[catId]);
        } else {
          tree.push(idMap[catId]);
        }
      });
    }
    
    // Sort children by name at each level
    const sortChildren = (nodes) => {
      if (!nodes) return;
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(node => sortChildren(node.children));
    };
    
    sortChildren(tree);
    res.json(tree);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
