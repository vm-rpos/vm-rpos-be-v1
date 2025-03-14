const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  }
}, { timestamps: true });

// Prevent OverwriteModelError
const Tag = mongoose.models.Tag || mongoose.model('Tag', TagSchema);

module.exports = Tag;
