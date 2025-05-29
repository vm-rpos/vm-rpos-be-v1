const mongoose = require("mongoose");

const superSchema = new mongoose.Schema(
  {
    // Sales Admin user
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    // Restaurants created by the Sales Admin
    createdRestaurants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant"
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Super", superSchema);
