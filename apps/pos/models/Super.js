// models/Super.js
const mongoose = require("mongoose");

const superSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    createdRestaurants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant"
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Super", superSchema);