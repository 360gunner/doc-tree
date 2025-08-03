const mongoose = require('mongoose');

const GlobalSettingsSchema = new mongoose.Schema({
  companyName: {
    type: String,
    default: 'Document Archive',
  },
  companyLogo: {
    type: String, // URL or relative path to the uploaded logo file
    default: '',
  },
  referenceFormat: {
    type: Object,
    default: {
      sequenceLength: 4, // Number of digits for sequence
      categoryMode: 'all', // 'all', 'last', 'root'
      separator: '/', // Separator string
      pattern: '', // Optional advanced pattern
    },
  },
}, { timestamps: true });

// Singleton pattern: always use the first document
GlobalSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('GlobalSettings', GlobalSettingsSchema);
