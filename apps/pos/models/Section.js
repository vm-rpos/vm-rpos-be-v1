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
  },
  charges: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: Number,
      required: true,
      min: 0
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Section', SectionSchema);
