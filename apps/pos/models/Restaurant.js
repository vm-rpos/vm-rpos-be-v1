const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: String,
    location: {
      address: String,
      city: String,
      state: String,
      zip: String,
    },
    contact: {
      phone: String,
      email: String,
    },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    qrImage: {
      type: String, // You can store the image URL or a base64 string
      default: "",  // Optional: default to an empty string
    },
  },
  
  { timestamps: true }
);

const Restaurant = mongoose.model("Restaurant", restaurantSchema);

module.exports = Restaurant;
