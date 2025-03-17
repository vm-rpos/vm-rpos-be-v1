const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Update this schema to be compatible with your frontend
const orderItemSchema = new Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  // Add these fields that are required based on the validation error
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  }
});

const orderSchema = new Schema({
  orderType: {
    type: String,
    enum: ['purchaseOrder', 'saleOrder', 'stockoutOrder'],
    required: true
  },
  // Add tableId as required based on validation error
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: function() {
      return this.orderType === 'purchaseOrder';
    }
  },
  destination: {
    type: String,
    enum: ['kitchen', 'sale'],
    required: function() {
      return this.orderType === 'saleOrder' || this.orderType === 'stockoutOrder';
    }
  },
  expectedDeliveryDate: {
    type: Date,
    required: true
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['pending', 'order successful', 'in transit', 'delivered'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});



module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);

