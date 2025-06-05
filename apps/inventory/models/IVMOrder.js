const mongoose = require('mongoose');

const IVMOrderSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  orderType: {
    type: String,
    enum: ['purchaseOrder', 'saleOrder', 'stockoutOrder', 'spoilageOrder'],
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
    required: function() {
      return this.orderType === 'saleOrder' || this.orderType === 'stockoutOrder';
    }
  },
  items: [{
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
      min: 0
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },

    reason: {
      type: String,
      required: function() {
        // Get the parent document's orderType
        return this.parent().orderType === 'spoilageOrder';
      }
    },
    reportedBy: {
      type: String,
      default: '',
      required: false
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: function() {
        return this.parent().orderType === 'spoilageOrder';
      }
    },
    totalLossValue: {
      type: Number,
      default: function() {
        if (this.parent().orderType === 'spoilageOrder') {
          return this.quantity * this.price;
        }
        return undefined;
      }
    }
  }],
  status: {
    type: String,
    enum: ['order successful', 'in transit', 'delivered'],
    default: 'order successful'
  },
  expectedDeliveryDate: {
    type: Date,
    required: function() {
      return this.orderType !== 'spoilageOrder';
    }
  },
  // Additional notes for any order type
  notes: {
    type: String,
    default: ''
  }
}, { 
  timestamps: true 
});

// Pre-save middleware to calculate totalLossValue for spoilage items
IVMOrderSchema.pre('save', function(next) {
  if (this.orderType === 'spoilageOrder') {
    this.items.forEach(item => {
      if (item.quantity && item.price) {
        item.totalLossValue = item.quantity * item.price;
      }
    });
  }
  next();
});

// Index for better query performance
IVMOrderSchema.index({ restaurantId: 1, orderType: 1, createdAt: -1 });
IVMOrderSchema.index({ restaurantId: 1, status: 1 });
IVMOrderSchema.index({ restaurantId: 1, vendorId: 1 });

// Prevent OverwriteModelError
const IVMOrder = mongoose.models.IVMOrder || mongoose.model('IVMOrder', IVMOrderSchema);

module.exports = IVMOrder;