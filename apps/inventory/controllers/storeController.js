const IvmItem = require('../models/Item');
const IvmOrder = require('../models/IVMOrder');
const mongoose = require('mongoose');

// Get total store value
exports.getTotalStoreValue = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;

    const items = await IvmItem.find({ restaurantId });
    
    let totalStoreValue = 0;

    for (const item of items) {
      totalStoreValue += item.quantity * item.price;
    }

    res.json({ totalStoreValue });
  } catch (err) {
    console.error('Error calculating store value:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// Get order values (purchase, sale, stockout)
exports.getOrderValues = async (req, res) => {
  try {
    const restaurantId = new mongoose.Types.ObjectId(req.user.restaurantId); // Ensure correct type

    const results = await IvmOrder.aggregate([
      { $match: { restaurantId } },
      { $group: { _id: "$orderType", count: { $sum: 1 } } }
    ]);

    const counts = {
      purchaseOrder: 0,
      saleOrder: 0,
      stockoutOrder: 0
    };

    for (const r of results) {
      if (counts.hasOwnProperty(r._id)) {
        counts[r._id] = r.count;
      }
    }

    res.json(counts);
  } catch (err) {
    console.error('Error calculating IVM order values:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


