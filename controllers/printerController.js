const escpos = require('escpos');

const printReceipt = async (req, res) => {
  try {
    const { items, total } = req.body;
    const device = new escpos.USB(); // Adjust for network or Bluetooth printer
    const printer = new escpos.Printer(device);

    device.open((err) => {
      if (err) return res.status(500).json({ error: 'Printer error' });

      printer.align('center').style('b').text('Restobar');
      printer.text('------------------------------');
      
      // Check if it's an order for kitchen (no prices) or a receipt for customer
      const isKitchenOrder = !total;
      
      if (isKitchenOrder) {
        printer.style('b').text('KITCHEN ORDER');
        printer.text('------------------------------');
      }
      
      items.forEach((item) => {
        if (isKitchenOrder) {
          // For kitchen: just item and quantity
          printer.text(`${item.name}   x${item.qty}`);
        } else {
          // For customer: include price
          printer.text(`${item.name}   x${item.qty}   ₹${item.price}`);
        }
      });
      
      printer.text('------------------------------');
      
      // Only print total for customer receipts
      if (!isKitchenOrder && total) {
        printer.align('right').text(`Total: ₹${total}`);
      }
      
      // Add timestamp
      const now = new Date();
      printer.align('center').text(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
      
      printer.cut().close();
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Printing failed' });
  }
};

module.exports = { printReceipt };