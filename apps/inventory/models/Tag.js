const mongoose = require('mongoose');

const IvmTagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  }
}, { timestamps: true });

const IvmTag = mongoose.models.IvmTag || mongoose.model('IvmTag', IvmTagSchema);

module.exports = IvmTag;
