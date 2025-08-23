const whatsappService = require("./utils/whatsappService");

async function testWhatsApp() {
  console.log("Testing WhatsApp service...");

  try {
    // Test initialization
    console.log("1. Initializing WhatsApp service...");
    const initResult = await whatsappService.initialize();
    console.log("Init result:", initResult);

    if (initResult.success) {
      // Test connection status
      console.log("2. Getting connection status...");
      const status = await whatsappService.getConnectionStatus();
      console.log("Status:", status);

      if (status.hasQRCode) {
        console.log("3. QR Code available for scanning");
        console.log("QR Code:", status.qrCode.substring(0, 50) + "...");
      }
    }
  } catch (error) {
    console.error("Test failed:", error);
  }

  // Exit after 5 seconds
  setTimeout(() => {
    console.log("Test completed");
    process.exit(0);
  }, 5000);
}

testWhatsApp();
