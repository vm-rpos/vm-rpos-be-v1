const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  phonenumber: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  restaurantId: { type: String, required: true },
  pin: { type: String, required: true },
  role: { type: String, enum: ["admin", "pos","ivm"], required: true },
  tokens: [{
    accessToken: { type: String },
    refreshToken: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);