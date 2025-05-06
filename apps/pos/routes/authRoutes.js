const express = require("express");
const { signup, login, verifyPin, refreshToken, logout } = require("../controllers/authController");


const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify-pin", verifyPin);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);

module.exports = router;