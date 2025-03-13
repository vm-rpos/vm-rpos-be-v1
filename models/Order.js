// models/Order.js
const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  categoryName: {
    type: String,
    required: false,
    default: 'Uncategorized'
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: false
  }
});

const OrderSchema = new mongoose.Schema({
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  waiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Waiter',
    required: false
  },
  items: [OrderItemSchema],
  total: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);