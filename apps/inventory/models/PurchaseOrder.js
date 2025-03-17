const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  itemId: {  // Changed from 'item' to 'itemId'
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    default: null
  },
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

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);