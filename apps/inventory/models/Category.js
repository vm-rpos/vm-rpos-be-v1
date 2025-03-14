const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  }
}, { timestamps: true });

// Prevent OverwriteModelError
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

module.exports = Category;
