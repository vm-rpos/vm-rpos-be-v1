const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      trim: true
    },
    age: {
      type: Number,
      required: true,
      min: 18
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{10}$/, 'Phone number must be exactly 10 digits']
    },
    location: {
      address: String,
      city: String,
      state: String,
      zip: String
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: false
    }
  }, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);