const mongoose = require('mongoose');

const TableOrderItemSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number,
  categoryName: String,
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item"
  }
});

const TableSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  tableNumber: { type: Number, required: true },
  seats: Number,
  hasOrders: { type: Boolean, default: false },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true
  },
  waiter: {
    _id: mongoose.Schema.Types.ObjectId,
    name: String,
    phoneNumber: String,
    age: Number
  },
  currentOrderItems: [TableOrderItemSchema],
  firstOrderTime: Date,
  currentBillAmount: { type: Number, default: 0 },
  paymentMethod: { type: String, default: null },
  billNumber: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Table', TableSchema);
