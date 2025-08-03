// Utility to generate a reference preview on the frontend (must match backend logic)
export function generateReferencePreview({
  sequenceLength = 4,
  categoryMode = 'all',
  separator = '/',
  pattern = '',
  code = '0001',
  year = new Date().getFullYear(),
  name = 'Document',
  categories = ['Main', 'Sub'],
}) {
  const seq = String(code).padStart(sequenceLength, '0');
  let catStr = '';
  if (categoryMode === 'last') {
    catStr = categories[categories.length - 1] || '';
  } else if (categoryMode === 'root') {
    catStr = categories[0] || '';
  } else {
    catStr = categories.join(separator);
  }
  if (pattern && pattern.includes('{')) {
    return pattern
      .replace('{seq}', seq)
      .replace('{cat}', catStr)
      .replace('{sep}', separator)
      .replace('{year}', year)
      .replace('{name}', name || '');
  } else {
    return `${seq}${separator}${catStr}`;
  }
}
