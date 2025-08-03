const Role = require('../models/Role');
const Category = require('../models/Category');
const OrganigramNode = require('../models/OrganigramNode');

// List all roles
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find()
      .populate('archiveCategories.category')
      .populate('organigramNodes.node');
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single role
exports.getRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate('archiveCategories.category')
      .populate('organigramNodes.node');
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new role
exports.createRole = async (req, res) => {
  try {
    const { name, description, archiveCategories = [], organigramNodes = [] } = req.body;
    if (name && name.toLowerCase() === 'admin') {
      return res.status(400).json({ error: 'Cannot create or overwrite the default admin role' });
    }
    const exists = await Role.findOne({ name });
    if (exists) return res.status(400).json({ error: 'Role name already exists' });
    // Validate permissions structure
    const formattedArchiveCategories = archiveCategories.map(c =>
      typeof c === 'object' && c.category ? c : { category: c, permissions: 'view' }
    );
    const formattedOrganigramNodes = organigramNodes.map(n =>
      typeof n === 'object' && n.node ? n : { node: n, permissions: 'view' }
    );
    const role = new Role({ name, description, archiveCategories: formattedArchiveCategories, organigramNodes: formattedOrganigramNodes });
    await role.save();
    res.json(await Role.findById(role._id).populate('archiveCategories.category').populate('organigramNodes.node'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a role
exports.updateRole = async (req, res) => {
  try {
    const { name, description, archiveCategories, organigramNodes } = req.body;
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.name === 'admin') {
      return res.status(403).json({ error: 'Cannot update the admin role' });
    }
    if (name && name.toLowerCase() === 'admin') {
      return res.status(400).json({ error: 'Cannot rename a role to admin' });
    }
    if (name) role.name = name;
    if (description) role.description = description;
    if (archiveCategories) {
      role.archiveCategories = archiveCategories.map(c =>
        typeof c === 'object' && c.category ? c : { category: c, permissions: 'view' }
      );
    }
    if (organigramNodes) {
      role.organigramNodes = organigramNodes.map(n =>
        typeof n === 'object' && n.node ? n : { node: n, permissions: 'view' }
      );
    }
    await role.save();
    res.json(await Role.findById(role._id).populate('archiveCategories.category').populate('organigramNodes.node'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a role
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.name === 'admin') {
      return res.status(403).json({ error: 'Cannot delete the admin role' });
    }
    await Role.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
