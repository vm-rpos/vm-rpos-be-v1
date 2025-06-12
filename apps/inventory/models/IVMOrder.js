const mongoose = require("mongoose");

const IVMOrderSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    orderType: {
      type: String,
      enum: ["purchaseOrder", "saleOrder", "stockoutOrder", "spoilageOrder"],
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: function () {
        return this.orderType === "purchaseOrder";
      },
    },
    destination: {
      type: String,
      required: function () {
        return (
          this.orderType === "saleOrder" || this.orderType === "stockoutOrder"
        );
      },
    },
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        stockout: {
          type: Number,
          min: 0,
        },
        quantity: {
          type: Number,
          required: true,
          min: 0,
        },
        stockin: {
          type: Number,
          min: 0,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        soldPrice: {
          type: Number,
          min: 0,
          required: function () {
            return this.ownerDocument().orderType === "saleOrder";
          },
        },
        categoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
          required: function () {
            return this.ownerDocument().orderType === "spoilageOrder";
          },
        },
        totalLossValue: {
          type: Number,
          default: function () {
            if (this.ownerDocument().orderType === "spoilageOrder") {
              return this.quantity * this.price;
            }
            return undefined;
          },
        },
        reason: {
          type: String,
          default: undefined, // Optional field; only meaningful for spoilageOrder
        },
      },
    ],
    status: {
      type: String,
      enum: ["order successful", "in transit", "delivered"],
      default: "order successful",
    },
    expectedDeliveryDate: {
      type: Date,
      required: function () {
        return this.orderType !== "spoilageOrder";
      },
    },
    saveFlag: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to calculate totalLossValue for spoilage items
IVMOrderSchema.pre("save", function (next) {
  if (this.orderType === "spoilageOrder") {
    this.items.forEach((item) => {
      if (item.quantity && item.price) {
        item.totalLossValue = item.quantity * item.price;
      }
    });
  }
  // Strip notes if spoilageOrder
  if (this.orderType === "spoilageOrder") {
    this.notes = undefined;
  }
  next();
});

// Indexes for performance
IVMOrderSchema.index({ restaurantId: 1, orderType: 1, createdAt: -1 });
IVMOrderSchema.index({ restaurantId: 1, status: 1 });
IVMOrderSchema.index({ restaurantId: 1, vendorId: 1 });

// Prevent OverwriteModelError
const IVMOrder =
  mongoose.models.IVMOrder || mongoose.model("IVMOrder", IVMOrderSchema);

module.exports = IVMOrder;