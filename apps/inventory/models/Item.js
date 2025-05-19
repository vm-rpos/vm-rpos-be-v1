const mongoose = require('mongoose');

const IvmItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  avgPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  description: {
    type: String,
    default: "",
    trim: true
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IvmTag'
  }],
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IvmCategory',
    required: true
  },
  categoryName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPurchaseValue: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

// Prevent OverwriteModelError
const IvmItem = mongoose.models.IvmItem || mongoose.model('IvmItem', IvmItemSchema);

module.exports = IvmItem;