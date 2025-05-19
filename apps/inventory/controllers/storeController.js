const IvmItem = require('../models/Item');
const IvmOrder = require('../models/IVMOrder'); // Ensure this model is properly defined

// Get total store value
exports.getTotalStoreValue = async (req, res) => {
  try {
    const items = await IvmItem.find({});

    let totalStoreValue = items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    res.json({ totalStoreValue });
  } catch (error) {
    console.error('Error calculating total store value:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get order values (purchase, sale, stockout)
exports.getOrderValues = async (req, res) => {
  try {
    const orders = await IvmOrder.find();

    const orderValues = {
      purchaseOrder: 0,
      saleOrder: 0,
      stockoutOrder: 0
    };

    orders.forEach(order => {
      const totalOrderValue = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      if (order.orderType in orderValues) {
        orderValues[order.orderType] += totalOrderValue;
      }
    });

    res.json(orderValues);
  } catch (error) {
    console.error('Error calculating order values:', error);
    res.status(500).json({ message: 'Error calculating order values', error });
  }
};
