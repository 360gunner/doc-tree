const mongoose = require('mongoose');

const OrganigramNodeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'OrganigramNode', default: null },
  file: { type: String, default: null }, // current file URL
  completed: { type: Boolean, default: false },
  type: {
    type: String,
    enum: ['parent_document', 'parent_node', 'child_document'],
    default: 'parent_document',
    required: true
  },
  versions: [{
    reference: { type: String, required: true },
    file: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  referenceFormat: {
    sequenceLength: { type: Number, default: 4 },
    categoryMode: { type: String, default: 'all' },
    separator: { type: String, default: '/' },
    pattern: { type: String, default: '' }
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OrganigramNode', OrganigramNodeSchema);
