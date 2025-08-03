require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const { generateReferencePreview } = require('../../src/utils/referencePreview');

async function migrateCategories() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/archive', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Get all categories
    const categories = await Category.find({});
    console.log(`Found ${categories.length} categories to process`);

    // Process each category
    for (const category of categories) {
      // Skip if already has a reference
      if (category.reference) {
        console.log(`Skipping category ${category.name} - already has reference`);
        continue;
      }

      // Get the category path
      let path = [category.name];
      let current = category;
      while (current.parent) {
        current = await Category.findById(current.parent);
        if (current) {
          path.unshift(current.name);
        } else {
          break;
        }
      }

      // Get siblings to determine next sequence number
      const siblings = await Category.find({
        parent: category.parent || { $exists: false },
        _id: { $ne: category._id },
        reference: { $exists: true, $ne: null }
      });

      let nextSeq = 1;
      siblings.forEach(sib => {
        if (sib.reference) {
          const seqMatch = sib.reference.match(/^(\d+)/);
          if (seqMatch) {
            const seqNum = parseInt(seqMatch[1], 10);
            if (seqNum >= nextSeq) {
              nextSeq = seqNum + 1;
            }
          }
        }
      });

      // Generate reference
      const reference = generateReferencePreview({
        sequenceLength: 4,
        categoryMode: 'all',
        separator: '/',
        code: nextSeq.toString().padStart(4, '0'),
        categories: path,
        name: category.name
      });

      // Update category
      category.reference = reference;
      category.updatedAt = new Date();
      await category.save();
      console.log(`Updated category ${category.name} with reference: ${reference}`);
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateCategories();
