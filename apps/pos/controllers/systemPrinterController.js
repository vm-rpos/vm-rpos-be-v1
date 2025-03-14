// systemPrinterController.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const printReceiptWithSystem = async (req, res) => {
  try {
    const { items, total } = req.body;
    
    // Log to console as a backup
    console.log("======= RECEIPT =======");
    console.log("RESTOBAR");
    console.log("----------------------");
    
    const isKitchenOrder = !total;
    let receiptContent = "RESTOBAR\n";
    receiptContent += "------------------------\n";
    
    if (isKitchenOrder) {
      console.log("KITCHEN ORDER");
      receiptContent += "KITCHEN ORDER\n";
    } else {
      console.log("CUSTOMER RECEIPT");
      receiptContent += "CUSTOMER RECEIPT\n";
    }
    
    receiptContent += "------------------------\n";
    
    items.forEach((item) => {
      const priceStr = (!isKitchenOrder && item.price) ? `   ₹${item.price}` : '';
      const line = `${item.name}   x${item.qty}${priceStr}`;
      console.log(line);
      receiptContent += line + "\n";
    });
    
    receiptContent += "------------------------\n";
    
    if (!isKitchenOrder && total) {
      const totalLine = `Total: ₹${total}`;
      console.log(totalLine);
      receiptContent += totalLine + "\n";
    }
    
    const dateLine = `${new Date().toLocaleString()}`;
    console.log(dateLine);
    receiptContent += dateLine + "\n";
    
    console.log("======================");
    
    // Create temporary file with receipt content
    const tempFile = path.join(os.tmpdir(), 'receipt_' + Date.now() + '.txt');
    fs.writeFileSync(tempFile, receiptContent);
    
    let command = '';
    let printerName = req.body.printerName || '';
    
    // Create appropriate print command based on OS
    if (process.platform === 'win32') {
      // Windows
      if (printerName) {
        command = `print /D:"${printerName}" "${tempFile}"`;
      } else {
        command = `print "${tempFile}"`;
      }
    } else if (process.platform === 'linux') {
      // Linux
      if (printerName) {
        command = `lp -d "${printerName}" "${tempFile}"`;
      } else {
        command = `lp "${tempFile}"`;
      }
    } else if (process.platform === 'darwin') {
      // macOS
      if (printerName) {
        command = `lp -d "${printerName}" "${tempFile}"`;
      } else {
        command = `lp "${tempFile}"`;
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Unsupported operating system" 
      });
    }
    
    // Execute print command
    exec(command, (error, stdout, stderr) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        console.warn("Could not delete temp file:", e);
      }
      
      if (error) {
        console.error(`Error printing: ${error.message}`);
        return res.json({ 
          success: true, 
          message: "Print command failed, but receipt logged to console",
          error: error.message
        });
      }
      
      if (stderr) {
        console.warn(`Print stderr: ${stderr}`);
      }
      
      return res.json({ 
        success: true, 
        message: "Receipt sent to printer" 
      });
    });
    
  } catch (error) {
    console.error("Print error:", error);
    res.status(500).json({ 
      error: 'Printing failed', 
      details: error.message 
    });
  }
};

module.exports = { printReceiptWithSystem: printReceiptWithSystem };