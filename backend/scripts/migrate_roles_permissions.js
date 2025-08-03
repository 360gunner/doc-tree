// Migration script to update Role documents to new permissions schema
// - Sets all archiveCategories and organigramNodes to objects with 'view' or 'crud' permissions
// - Admin role gets 'crud' everywhere

const mongoose = require('mongoose');
const Role = require('../models/Role');
const Category = require('../models/Category');
const OrganigramNode = require('../models/OrganigramNode');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/your-db-name';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  const roles = await Role.find();
  const allCategories = await Category.find();
  const allNodes = await OrganigramNode.find();

  for (const role of roles) {
    // Migrate archiveCategories
    if (Array.isArray(role.archiveCategories) && role.archiveCategories.length > 0 && typeof role.archiveCategories[0] !== 'object') {
      // Old format: [ObjectId]
      role.archiveCategories = role.archiveCategories.map(catId => ({
        category: catId,
        permissions: role.name === 'admin' ? 'crud' : 'view'
      }));
    }
    // Migrate organigramNodes
    if (Array.isArray(role.organigramNodes) && role.organigramNodes.length > 0 && typeof role.organigramNodes[0] !== 'object') {
      // Old format: [ObjectId]
      role.organigramNodes = role.organigramNodes.map(nodeId => ({
        node: nodeId,
        permissions: role.name === 'admin' ? 'crud' : 'view'
      }));
    }
    // For admin: grant all permissions everywhere
    if (role.name === 'admin') {
      role.archiveCategories = allCategories.map(cat => ({
        category: cat._id,
        permissions: 'crud'
      }));
      role.organigramNodes = allNodes.map(node => ({
        node: node._id,
        permissions: 'crud'
      }));
    }
    await role.save();
    console.log(`Migrated role: ${role.name}`);
  }
  await mongoose.disconnect();
  console.log('Migration complete.');
}

migrate().catch(e => { console.error(e); process.exit(1); });
