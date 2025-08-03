const GlobalSettings = require('../models/GlobalSettings');
const Category = require('../models/Category');

/**
 * Generate a document reference string based on global settings and input data.
 * @param {Object} params
 * @param {string} params.categoryId - The category ID for the document
 * @param {number|string} params.year - The year
 * @param {string} params.code - The sequential code (already padded)
 * @param {string} params.name - The document name
 * @param {object} [params.settings] - Optional: settings object (to avoid extra DB call)
 * @returns {Promise<string>} The generated reference string
 */
async function generateReference({ categoryId, year, code, name, settings }) {
  // Fetch global settings if not provided
  if (!settings) {
    settings = await GlobalSettings.getSettings();
  }
  const refFormat = settings.referenceFormat || {};
  const sequenceLength = refFormat.sequenceLength || 4;
  const categoryMode = refFormat.categoryMode || 'all';
  const separator = refFormat.separator || '/';
  const pattern = refFormat.pattern || '';

  // Pad code
  const seq = String(code).padStart(sequenceLength, '0');

  // Get category names
  let categories = [];
  let current = await Category.findById(categoryId);
  while (current) {
    categories.unshift(current.name);
    if (!current.parent) break;
    current = await Category.findById(current.parent);
  }

  let catStr = '';
  if (categoryMode === 'last') {
    catStr = categories[categories.length - 1] || '';
  } else if (categoryMode === 'root') {
    catStr = categories[0] || '';
  } else {
    catStr = categories.join(separator);
  }

  // Default pattern: {cat}{sep}{year}{sep}{seq}
  let ref = '';
  if (pattern && pattern.includes('{')) {
    ref = pattern
      .replace('{seq}', seq)
      .replace('{cat}', catStr)
      .replace('{sep}', separator)
      .replace('{year}', year)
      .replace('{name}', name || '');
  } else {
    // Default: seq + sep + catStr
    ref = `${seq}${separator}${catStr}`;
  }
  return ref;
}

module.exports = { generateReference };
