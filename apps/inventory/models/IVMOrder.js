const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    default: 0
  }
});

const ivmOrderSchema = new mongoose.Schema({
  orderType: {
    type: String,
    enum: ['purchaseOrder', 'saleOrder', 'stockoutOrder'],
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
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['order successful', 'in transit', 'delivered'],
    default: 'order successful'
  },
  expectedDeliveryDate: {
    type: Date,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('IVMOrder', ivmOrderSchema);