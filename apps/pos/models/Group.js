const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Section'
  },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Restaurant'
    },
  waiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Waiter'
  },
  tableIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table'
  }]
}, { timestamps: true });

module.exports = mongoose.model('Group', GroupSchema);
