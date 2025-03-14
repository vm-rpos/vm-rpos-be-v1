const PurchaseOrder = require('../models/PurchaseOrder');
const Vendor = require('../models/Vendor');

// Get all purchase orders
exports.getAllPurchaseOrders = async (req, res) => {
  try {
    const orders = await PurchaseOrder.find().populate('vendorId', 'name'); // Populate vendor details
    res.json(orders);
  } catch (err) {
    console.error('Error fetching purchase orders:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new purchase order
exports.createPurchaseOrder = async (req, res) => {
    try {
      const { vendorId, item, quantity, expectedDeliveryDate } = req.body;
  
      if (!vendorId || !item || !quantity || !expectedDeliveryDate) {
        return res.status(400).json({ message: "All fields except price are required" });
      }
  
      const newOrder = new PurchaseOrder({
        vendorId,
        item,
        quantity,
        expectedDeliveryDate,
        price: null, // Ensure price can be empty
      });
  
      await newOrder.save();
      res.status(201).json(newOrder);
    } catch (err) {
      console.error("Error creating purchase order:", err);
      res.status(500).json({ message: "Server error" });
    }
  };
  
  // Update status of a purchase order
 exports.updateOrderStatus = async (req, res) => {
    try {
      const { status } = req.body;
      
      if (!['order successful', 'in transit', 'delivered'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      const updatedOrder = await PurchaseOrder.findByIdAndUpdate(
        req.params.id, 
        { status }, 
        { new: true }
      );
      
      if (!updatedOrder) return res.status(404).json({ message: 'Purchase order not found' });
      
      res.json(updatedOrder);
    } catch (err) {
      console.error('Error updating order status:', err);
      res.status(500).json({ message: 'Server error' });
    }
  };
// Create a new purchase order
exports.createPurchaseOrder = async (req, res) => {
  try {
    const { vendorId, item, quantity, price } = req.body;

    if (!vendorId || !item || !quantity) {
      return res.status(400).json({ message: 'Vendor, item, and quantity are required' });
    }

    const newOrder = new PurchaseOrder({ vendorId, item, quantity, price });
    await newOrder.save();

    res.status(201).json(newOrder);
  } catch (err) {
    console.error('Error creating purchase order:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a single purchase order by ID
exports.getPurchaseOrderById = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id).populate('vendorId', 'name');
    if (!order) return res.status(404).json({ message: 'Purchase order not found' });

    res.json(order);
  } catch (err) {
    console.error('Error fetching purchase order:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a purchase order
exports.updatePurchaseOrder = async (req, res) => {
  try {
    const { vendorId, item, quantity, price } = req.body;

    const updateData = {};
    if (vendorId) updateData.vendorId = vendorId;
    if (item) updateData.item = item;
    if (quantity) updateData.quantity = quantity;
    if (price) updateData.price = price;

    const updatedOrder = await PurchaseOrder.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Purchase order not found' });

    res.json(updatedOrder);
  } catch (err) {
    console.error('Error updating purchase order:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a purchase order
exports.deletePurchaseOrder = async (req, res) => {
  try {
    const deletedOrder = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ message: 'Purchase order not found' });

    res.json({ message: 'Purchase order deleted successfully' });
  } catch (err) {
    console.error('Error deleting purchase order:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
