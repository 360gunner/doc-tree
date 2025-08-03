const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  reference: { type: String, unique: true, sparse: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Helper for full path
CategorySchema.methods.getFullPath = async function() {
  let path = [this.name];
  let current = this;
  while (current.parent) {
    current = await this.model('Category').findById(current.parent);
    if (current) path.unshift(current.name);
    else break;
  }
  return path.join('/');
};

module.exports = mongoose.model('Category', CategorySchema);
