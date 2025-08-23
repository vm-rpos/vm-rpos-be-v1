const express = require("express");
const {
  whatsappLogin,
  sendMessage,
  changeLoginNumber,
  deleteLogin,
  getStatus,
} = require("../controllers/whatsappController");
const whatsappService = require("../../../utils/whatsappService");

const router = express.Router();

// WhatsApp routes
router.post("/login", whatsappLogin); // 1. WhatsApp login
router.post("/send-message", sendMessage); // 2. Send hello message to a number
router.put("/change-login", changeLoginNumber); // 3. Change login number
router.delete("/delete-login", deleteLogin); // 4. Delete WhatsApp login
router.get("/status", getStatus); // Bonus: Get current status
router.get("/qr-code", async (req, res) => {
  try {
    const result = await whatsappService.getQRCode();
    if (result.success) {
      res.json({
        success: true,
        qrCode: result.qrCode,
        instructions: "Scan this QR code with your WhatsApp mobile app",
        steps: [
          "1. Open WhatsApp on your mobile phone",
          "2. Go to Settings > Linked Devices",
          "3. Tap on 'Link a Device'",
          "4. Point your phone camera at this QR code",
          "5. Wait for the connection to be established",
        ],
        note: "The QR code will expire after a few minutes. If it expires, call this endpoint again to get a new QR code.",
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
        note: "Try calling POST /api/whatsapp/login first to initialize the WhatsApp service",
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reconnect", async (req, res) => {
  try {
    const result = await whatsappService.reconnect();
    if (result.success) {
      res.json({
        success: true,
        message: "WhatsApp service reconnected successfully",
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/clear-session", async (req, res) => {
  try {
    // Clear session files and force logout
    whatsappService.clearSessionFiles();
    const logoutResult = await whatsappService.logout();
    
    res.json({
      success: true,
      message: "Session cleared successfully. Please login again to get a new QR code.",
      logoutResult
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
