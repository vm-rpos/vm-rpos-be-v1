const mongoose = require("mongoose");

const whatsappSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    sessionData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
whatsappSchema.index({ isActive: 1 });
whatsappSchema.index({ phoneNumber: 1 });

module.exports = mongoose.model("WhatsApp", whatsappSchema);
