const WhatsApp = require("../models/WhatsApp");
const whatsappService = require("../../../utils/whatsappService");

// WhatsApp login - initialize WhatsApp service and generate QR code
exports.whatsappLogin = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Initialize WhatsApp service
    const initResult = await whatsappService.initialize();

    if (!initResult.success) {
      return res.status(500).json({
        error: "Failed to initialize WhatsApp service",
        details: initResult.error,
        note: "If you're getting authentication errors, try clearing the session first",
      });
    }

    // Check if there's already a WhatsApp session in database
    const existingSession = await WhatsApp.findOne();

    if (existingSession) {
      // Update existing session
      existingSession.phoneNumber = phoneNumber;
      existingSession.isActive = true;
      existingSession.lastLogin = new Date();
      await existingSession.save();
    } else {
      // Create new session
      const newWhatsAppSession = new WhatsApp({
        phoneNumber,
        isActive: true,
        lastLogin: new Date(),
      });
      await newWhatsAppSession.save();
    }

    // Wait a bit for QR code to be generated (if not already connected)
    let attempts = 0;
    let status = await whatsappService.getConnectionStatus();

    while (!status.isConnected && !status.hasQRCode && attempts < 10) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
      status = await whatsappService.getConnectionStatus();
      attempts++;
    }

    if (status.isConnected) {
      return res.status(200).json({
        message: "WhatsApp already connected",
        phoneNumber: phoneNumber,
        isActive: true,
        isConnected: true,
      });
    } else if (status.hasQRCode) {
      return res.status(200).json({
        message: "Scan QR code to login",
        phoneNumber: phoneNumber,
        isActive: true,
        isConnected: false,
        qrCode: status.qrCode,
        instructions: "Scan the QR code with your WhatsApp mobile app to login",
      });
    } else {
      return res.status(200).json({
        message: "WhatsApp service initialized, waiting for QR code",
        phoneNumber: phoneNumber,
        isActive: true,
        isConnected: false,
        note: "If QR code doesn't appear, call GET /api/whatsapp/qr-code endpoint to get the QR code",
      });
    }
  } catch (error) {
    console.error("WhatsApp login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Send hello message to a number
exports.sendMessage = async (req, res) => {
  try {
    const { targetNumber, message } = req.body;

    if (!targetNumber) {
      return res.status(400).json({ error: "Target phone number is required" });
    }

    // Check if WhatsApp is logged in
    const whatsappSession = await WhatsApp.findOne({ isActive: true });

    if (!whatsappSession) {
      return res
        .status(400)
        .json({ error: "WhatsApp not logged in. Please login first." });
    }

    // Check if WhatsApp service is connected
    const status = await whatsappService.getConnectionStatus();
    if (!status.isConnected) {
      return res.status(400).json({
        error: "WhatsApp not connected. Please scan QR code to login first.",
        needsQRCode: status.hasQRCode,
        qrCode: status.qrCode,
      });
    }

    // Send real WhatsApp message
    const messageText = message || `Hello from ${whatsappSession.phoneNumber}`;
    const result = await whatsappService.sendMessage(targetNumber, messageText);

    if (result.success) {
      return res.status(200).json({
        message: "Message sent successfully",
        from: whatsappSession.phoneNumber,
        to: targetNumber,
        content: messageText,
        messageId: result.messageId,
        timestamp: result.timestamp,
      });
    } else {
      return res.status(500).json({
        error: "Failed to send message",
        details: result.error,
      });
    }
  } catch (error) {
    console.error("Send message error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Change WhatsApp login number
exports.changeLoginNumber = async (req, res) => {
  try {
    const { newPhoneNumber } = req.body;

    if (!newPhoneNumber) {
      return res.status(400).json({ error: "New phone number is required" });
    }

    // Find existing WhatsApp session
    const existingSession = await WhatsApp.findOne({ isActive: true });

    if (!existingSession) {
      return res.status(400).json({
        error: "No active WhatsApp session found. Please login first.",
      });
    }

    // Logout current session and clear session files
    await whatsappService.logout();

    // Update the phone number in database
    existingSession.phoneNumber = newPhoneNumber;
    existingSession.lastLogin = new Date();
    await existingSession.save();

    // Reinitialize WhatsApp service for new number
    const initResult = await whatsappService.initialize();

    if (!initResult.success) {
      return res.status(500).json({
        error: "Failed to initialize WhatsApp service for new number",
      });
    }

    // Get connection status and QR code
    const status = await whatsappService.getConnectionStatus();

    if (status.isConnected) {
      return res.status(200).json({
        message: "WhatsApp login number changed successfully",
        newPhoneNumber: newPhoneNumber,
        isActive: true,
        isConnected: true,
      });
    } else if (status.hasQRCode) {
      return res.status(200).json({
        message: "Scan QR code to login with new number",
        newPhoneNumber: newPhoneNumber,
        isActive: true,
        isConnected: false,
        qrCode: status.qrCode,
        instructions:
          "Scan the QR code with your WhatsApp mobile app to login with the new number",
      });
    } else {
      return res.status(200).json({
        message: "WhatsApp service reinitialized, waiting for QR code",
        newPhoneNumber: newPhoneNumber,
        isActive: true,
        isConnected: false,
      });
    }
  } catch (error) {
    console.error("Change login number error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Delete WhatsApp login
exports.deleteLogin = async (req, res) => {
  try {
    // Find and delete the WhatsApp session
    const deletedSession = await WhatsApp.findOneAndDelete({ isActive: true });

    if (!deletedSession) {
      return res
        .status(404)
        .json({ error: "No active WhatsApp session found" });
    }

    // Logout from WhatsApp service and clear session files
    await whatsappService.logout();

    return res.status(200).json({
      message: "WhatsApp login deleted successfully",
      deletedPhoneNumber: deletedSession.phoneNumber,
    });
  } catch (error) {
    console.error("Delete login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get current WhatsApp status
exports.getStatus = async (req, res) => {
  try {
    const whatsappSession = await WhatsApp.findOne({ isActive: true });

    if (!whatsappSession) {
      return res.status(200).json({
        isLoggedIn: false,
        message: "No active WhatsApp session",
      });
    }

    // Get WhatsApp service connection status
    const serviceStatus = await whatsappService.getConnectionStatus();

    return res.status(200).json({
      isLoggedIn: true,
      phoneNumber: whatsappSession.phoneNumber,
      lastLogin: whatsappSession.lastLogin,
      isActive: whatsappSession.isActive,
      isConnected: serviceStatus.isConnected,
      hasQRCode: serviceStatus.hasQRCode,
      qrCode: serviceStatus.qrCode,
    });
  } catch (error) {
    console.error("Get status error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
