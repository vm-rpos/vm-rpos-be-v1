const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema({
  section: {
    type: String,
    required: true,
    trim: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Restaurant'
  }
}, { timestamps: true });

module.exports = mongoose.model('Section', SectionSchema);
