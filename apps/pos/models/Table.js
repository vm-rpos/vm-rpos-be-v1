const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  tableNumber: {
    type: Number,
    required: true,
    unique: true
  },
  hasOrders: {
    type: Boolean,
    default: false
  },
  restaurantId: {  // ✅ Add restaurantId field
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Table', TableSchema);
