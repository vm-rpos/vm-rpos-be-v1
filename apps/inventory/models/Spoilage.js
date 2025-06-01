const mongoose = require('mongoose');

const SpoilageSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  spoiledQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  totalLossValue: {
    type: Number,
    default: 0,
    min: 0
  },
  spoilDate: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    enum: [
      'Expired',
      'Damaged in Transit',
      'Contaminated',
      'Improper Storage',
      'Broken Packaging',
      'Recall',
      'Human Error',
      'Spoiled',
      'Temperature Abuse',
      'Pest Infestation',
      'Other'
    ],
    required: true
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  imageUrl: {
    type: String,
    trim: true
  }
}, { 
  timestamps: true 
});

// Calculate total loss value before saving
SpoilageSchema.pre('save', function(next) {
  if (this.spoiledQuantity && this.price) {
    this.totalLossValue = this.spoiledQuantity * this.price;
  }
  next();
});

// Index for better query performance
SpoilageSchema.index({ restaurantId: 1, itemId: 1, spoilDate: -1 });

// Prevent OverwriteModelError
const Spoilage = mongoose.models.Spoilage || mongoose.model('Spoilage', SpoilageSchema);

module.exports = Spoilage;