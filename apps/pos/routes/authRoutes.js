const express = require("express");
const {
  signup,
  register,
  login,
  verifyPin,
  refreshToken,
  logout,
  verifyEmail,
  resendVerificationCode,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

// Authentication routes
router.post("/signup", signup);
router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationCode);
router.post("/login", login);
router.post("/verify-pin", verifyPin);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

// Password reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
