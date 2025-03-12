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
      items.forEach((item) => {
        printer.text(`${item.name}   x${item.qty}   $${item.price}`);
      });
      printer.text('------------------------------');
      printer.align('right').text(`Total: $${total}`);
      printer.cut().close();
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Printing failed' });
  }
};

module.exports = { printReceipt };
