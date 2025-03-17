const mongoose = require('mongoose');

const IvmCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  }
}, { timestamps: true });

// Prevent OverwriteModelError
const IvmCategory = mongoose.models.IvmCategory || mongoose.model('IvmCategory', IvmCategorySchema, 'ivmcategories');

module.exports = IvmCategory;
