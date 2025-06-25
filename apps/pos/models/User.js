const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  phonenumber: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  restaurantId: { type: String },
  pin: { type: String, required: true },
  role: { type: String, enum: ["admin", "pos","ivm","superadmin","salesadmin","waiter"], required: true },
  tokens: [{
    accessToken: { type: String },
    refreshToken: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  // Email verification fields
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationCode: { type: String },
  emailVerificationExpiry: { type: Date },
  // Password reset fields
  passwordResetCode: { type: String },
  passwordResetExpiry: { type: Date },
  isActive: { type: Boolean, default: false }, // User becomes active only after email verification
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);