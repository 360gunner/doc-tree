const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  // Per-category permissions
  archiveCategories: [{
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    permissions: { type: String, enum: ['view', 'crud'], default: 'view' }
  }],
  // Per-organigram node permissions
  organigramNodes: [{
    node: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganigramNode', required: true },
    permissions: { type: String, enum: ['view', 'crud'], default: 'view' }
  }],
});

module.exports = mongoose.model('Role', RoleSchema);
