const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  tableNumber: {
    type: Number,
    required: true
  },
  seats: {
    type: Number,
    required: true,
    min: 1
  },
  hasOrders: {
    type: Boolean,
    default: false
  },
  restaurantId: {  // ✅ Add restaurantId field
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Table', TableSchema);
