// models/Tag.js
const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Tag', TagSchema);