const mongoose = require("mongoose");

const waiterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: 18,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{10}$/, "Phone number must be exactly 10 digits"],
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    tables: {
      type: [Object],
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Waiter", waiterSchema);
