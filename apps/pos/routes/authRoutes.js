const express = require("express");
const { 
  signup, 
  login, 
  verifyPin, 
  refreshToken, 
  logout,
  verifyEmail,
  resendVerificationCode
} = require("../controllers/authController");

const router = express.Router();

// Authentication routes
router.post("/signup", signup);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationCode);
router.post("/login", login);
router.post("/verify-pin", verifyPin);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

module.exports = router;