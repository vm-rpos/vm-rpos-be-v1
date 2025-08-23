const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.qrCode = null;
    this.authFolder = path.join(__dirname, "../whatsapp-sessions");

    // Create sessions folder if it doesn't exist
    if (!fs.existsSync(this.authFolder)) {
      fs.mkdirSync(this.authFolder, { recursive: true });
    }
  }

  async initialize() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);

      this.client = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Remove deprecated option
        // Remove logger entirely to avoid issues
      });

      this.client.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          // Generate QR code for login
          this.qrCode = qr;
          console.log("QR Code received, scan it with WhatsApp:");
          qrcode.generate(qr, { small: true });

          // Emit an event or set a flag to indicate QR code is ready
          this.qrCodeReady = true;
        }

        if (connection === "close") {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(
            "Connection closed due to ",
            lastDisconnect?.error,
            ", reconnecting ",
            shouldReconnect
          );

          // If we get 401 Unauthorized, clear the session
          if (statusCode === 401) {
            console.log("Received 401 Unauthorized - clearing session files");
            this.clearSessionFiles();
            this.qrCode = null;
            this.isConnected = false;
          } else if (shouldReconnect) {
            // Don't auto-reconnect to avoid infinite loops
            this.isConnected = false;
          } else {
            this.isConnected = false;
          }
        } else if (connection === "open") {
          console.log("WhatsApp connected successfully!");
          this.isConnected = true;
          this.qrCode = null; // Clear QR code after successful connection
        }
      });

      this.client.ev.on("creds.update", saveCreds);

      return { success: true, message: "WhatsApp service initialized" };
    } catch (error) {
      console.error("Error initializing WhatsApp service:", error);
      return { success: false, error: error.message };
    }
  }

  async sendMessage(phoneNumber, message) {
    try {
      if (!this.client || !this.isConnected) {
        throw new Error("WhatsApp client not connected");
      }

      // Format phone number (remove + and add country code if needed)
      let formattedNumber = phoneNumber.replace(/[^0-9]/g, "");

      // If number doesn't start with country code, assume it's Indian (+91)
      if (formattedNumber.length === 10) {
        formattedNumber = "91" + formattedNumber;
      }

      // Add @s.whatsapp.net suffix
      const jid = `${formattedNumber}@s.whatsapp.net`;

      const result = await this.client.sendMessage(jid, { text: message });

      return {
        success: true,
        messageId: result.key.id,
        timestamp: result.messageTimestamp,
        to: phoneNumber,
        content: message,
      };
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      hasQRCode: !!this.qrCode,
      qrCode: this.qrCode,
    };
  }

  clearSessionFiles() {
    try {
      if (fs.existsSync(this.authFolder)) {
        fs.rmSync(this.authFolder, { recursive: true, force: true });
        console.log("Session files cleared successfully");
      }
    } catch (error) {
      console.error("Error clearing session files:", error);
    }
  }

  async logout() {
    try {
      if (this.client) {
        await this.client.logout();
        this.isConnected = false;
        this.qrCode = null;

        // Clear session files
        this.clearSessionFiles();

        return { success: true, message: "Logged out successfully" };
      }
      return { success: false, error: "No active session" };
    } catch (error) {
      console.error("Error logging out:", error);
      return { success: false, error: error.message };
    }
  }

  async getQRCode() {
    if (this.qrCode) {
      return {
        success: true,
        qrCode: this.qrCode,
      };
    }
    return {
      success: false,
      error: "No QR code available",
    };
  }

  async reconnect() {
    try {
      if (this.client) {
        this.client.end();
      }
      this.isConnected = false;
      this.qrCode = null;
      return await this.initialize();
    } catch (error) {
      console.error("Error reconnecting:", error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
