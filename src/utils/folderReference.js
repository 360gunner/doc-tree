import { generateReferencePreview } from './referencePreview';

/**
 * Generates a reference for a new folder based on parent folder and existing siblings
 * @param {Object} options - Options for reference generation
 * @param {Array} options.categories - Flat or nested array of all categories
 * @param {string} options.parentId - ID of the parent category (null for root)
 * @param {string} options.newFolderName - Name of the new folder
 * @param {Object} options.referenceFormat - Reference format settings
 * @param {number} options.referenceFormat.sequenceLength - Length of sequence number
 * @param {string} options.referenceFormat.categoryMode - How to handle category names in reference
 * @param {string} options.referenceFormat.separator - Separator between reference parts
 * @param {string} options.referenceFormat.pattern - Reference pattern with placeholders
 * @returns {string} Generated reference for the new folder
 */
export function generateFolderReference({
  categories = [],
  parentId = null,
  newFolderName = '',
  referenceFormat = {}
}) {
  // Get the category path for the parent
  const getCategoryPath = (categoryId, path = []) => {
    if (!categoryId) return [];
    const category = categories.find(cat => cat.id === categoryId || cat._id === categoryId);
    if (!category) return [];
    return [...getCategoryPath(category.parent), category.name];
  };

  // Get all categories at the same level as the new folder
  const siblings = categories.filter(
    cat => (cat.parent === parentId || (cat.parent?._id === parentId) || (!cat.parent && !parentId))
  );

  // Find the highest sequence number among siblings
  let maxSeq = 0;
  siblings.forEach(cat => {
    if (cat.reference) {
      const seqMatch = cat.reference.match(/^(\d+)/);
      if (seqMatch) {
        const seqNum = parseInt(seqMatch[1], 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    }
  });

  // Generate the next sequence number
  const nextSeq = (maxSeq + 1).toString().padStart(referenceFormat.sequenceLength || 4, '0');
  
  // Build the category path for the new folder
  const parentPath = getCategoryPath(parentId);
  const allCategories = [...parentPath, newFolderName];

  // Generate the reference
  return generateReferencePreview({
    ...referenceFormat,
    code: nextSeq,
    categories: allCategories,
    name: newFolderName,
    year: new Date().getFullYear()
  });
}
