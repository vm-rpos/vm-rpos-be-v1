const Item = require('../models/Item');

// Get all items
exports.getAllItems = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId; // ✅ From token
    const items = await Item.find({ restaurantId }).populate('categoryId tags');
    res.json(items);
  } catch (err) {
    console.error('Error getting items:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// Get a specific item by ID
exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('categoryId tags');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    console.error('Error getting item:', err);
    res.status(500).json({ message: 'Server error' });
  }
};