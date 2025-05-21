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
  },
  isCancelled: { type: Boolean, default: false },
cancelledReason: { type: String, default: null }

});

const OrderSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true // Ensure every order belongs to a restaurant
  },
  billNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
    sectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        required: true
      },
      sectionName: 
      { 
        type: String 
      },
  waiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Waiter',
    required: false
  },
  waiter: {
    type: String, // This will store the name of the waiter
    required: false
  },
  paymentMethod: {
    type: String,
    required: false,
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
  },
  isDeleted: { type: Boolean, default: false },
deletedReason: { type: String, default: null }

}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
