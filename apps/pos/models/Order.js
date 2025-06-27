const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: false
  },
  quantity: {
    type: Number,
    required: false,
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
  cancelledReason: { type: String, default: null },
  round: {                   // <-- New round field added here
    type: Number,
    required: true,
    default: 1
  }
});

const ChargeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  }
});

const OrderSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
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
  sectionName: { 
    type: String 
  },
  waiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Waiter',
    required: false
  },
  waiter: {
    type: String,
    required: false
  },

  paymentMethod: {
    type: String,
    required: false,
  },
  items: [OrderItemSchema],
  charges: [ChargeSchema],

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
