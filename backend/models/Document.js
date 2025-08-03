const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  year: { type: Number, required: true },
  code: { type: String, required: true }, // e.g., '0001', '0002', etc.
  referencePath: { type: String, required: true }, // e.g., 'FOLDER/SUB/YEAR/0001'
  completed: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed }, // flexible for user data
  createdAt: { type: Date, default: Date.now },
  name: { type: String },
  reference: { type: String },
  files: [{ type: String }], // array of file URLs
});

module.exports = mongoose.model('Document', DocumentSchema);
