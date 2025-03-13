const escpos = require("escpos");
// Correct import for adapters
escpos.USB = require("escpos-usb");
escpos.Network = require("escpos-network");
escpos.Serial = require("escpos-serialport");

// printerController.js
const printReceipt = async (req, res) => {
  try {
    const { items, total, printerType = "usb" } = req.body;

    // Configure device based on printer type
    let device;
    switch (printerType) {
      case "usb":
        // Set your USB vendor ID and product ID
        // Use lsusb command in Linux to find these values
        device = new escpos.USB(0x04b8, 0x0202); // Example IDs for Epson printer
        break;
      case "network":
        // For network printers
        device = new escpos.Network("192.168.1.100", 9100); // Replace with your printer IP and port
        break;
      case "serial":
        // For serial port printers
        device = new escpos.Serial("/dev/usb/lp0", {
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: "none",
        });
        break;
      default:
        throw new Error("Unsupported printer type");
    }

    // Create printer instance
    const printer = new escpos.Printer(device);

    // Check if it's an order for kitchen (no prices) or a receipt for customer
    const isKitchenOrder = !total;

    // Open connection to printer
    device.open(function () {
      // Initialize the printer
      printer.initialize();

      // Set text size
      printer.size(1, 1);
      // Set font
      printer.font("a");
      // Set text alignment
      printer.align("center");

      printer.text("RESTOBAR");
      printer.drawLine();

      if (isKitchenOrder) {
        printer.style("b"); // Bold
        printer.text("KITCHEN ORDER");
        printer.style("normal");
        printer.drawLine();
      }

      // Reset alignment for items
      printer.align("left");

      // Print items
      items.forEach((item) => {
        if (isKitchenOrder) {
          // For kitchen: just item and quantity
          printer.text(`${item.name}   x${item.qty}`);
        } else {
          // For customer: include price
          printer.tableCustom([
            { text: item.name, width: 0.5 },
            { text: `x${item.qty}`, width: 0.2, align: "right" },
            { text: `₹${item.price}`, width: 0.3, align: "right" },
          ]);
        }
      });

      printer.drawLine();

      // Only print total for customer receipts
      if (!isKitchenOrder && total) {
        printer.align("right");
        printer.text(`Total: ₹${total}`);
        printer.align("left");
      }

      // Add timestamp
      const now = new Date();
      printer.text(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);

      // Cut paper
      printer.cut();
      printer.close();
    });

    // Return success response
    res.json({ success: true, message: "Receipt printed successfully" });
  } catch (error) {
    console.error("Print error:", error);
    res.status(500).json({ error: "Printing failed", details: error.message });
  }
};

const printReceipt2 = async (req, res) => {
  try {



    const usb = require('usb');

// Vendor and Product ID in hexadecimal string format
const VENDOR_ID_HEX = '09C5';  // Hex string for Vendor ID
const PRODUCT_ID_HEX = '58DE'; // Hex string for Product ID

// Convert the hexadecimal string IDs to decimal
const VENDOR_ID = parseInt(VENDOR_ID_HEX, 16);  // Converts '09C5' to decimal (2501)
const PRODUCT_ID = parseInt(PRODUCT_ID_HEX, 16); // Converts '58DE' to decimal (22718)

// Find the printer using the vendor and product ID in decimal
const printer = usb.findByIds(VENDOR_ID, PRODUCT_ID);

if (printer) {
    printer.open();

    // Prepare your raw data (for ESC/POS commands, for example)
    const buffer = Buffer.from([
        0x1B, 0x40, // ESC @ - Initialize the printer
        0x1B, 0x61, 0x01, // ESC a 1 - Center alignment
        ...Buffer.from('Hello, World!\n'),
        0x1D, 0x56, 0x01, // GS V 1 - Cut paper command
    ]);

    // Send raw data to the printer
    printer.controlTransfer(0x40, 0x01, 0, 0, buffer, (error) => {
        if (error) {
            console.error('Error printing:', error);
        } else {
            console.log('Printed successfully!');
        }
    });
} else {
    console.log('Printer not found!');
}



    res.status(200).json({ error: "Printing success" });
  } catch (error) {
    console.error("Print error:", error);
    res.status(500).json({ error: "Printing failed", details: error.message });
  }
};

module.exports = { printReceipt, printReceipt2 };

// //     "escpos": "^3.0.0-alpha.6",
// "escpos-adapter": "^3.0.0-alpha.4",
// "escpos-network": "^3.0.0-alpha.5",
// "escpos-serialport": "^3.0.0-alpha.4",
// "escpos-usb": "^3.0.0-alpha.4",
