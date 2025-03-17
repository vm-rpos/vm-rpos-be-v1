const PurchaseOrder = require('../models/PurchaseOrder');
const Vendor = require('../models/Vendor');

// In your purchaseOrderController.js
exports.createPurchaseOrder = async (req, res) => {
  try {
    const { vendorId, itemId, quantity, expectedDeliveryDate } = req.body;
    
    // Create new purchase order
    const newOrder = new PurchaseOrder({
      vendorId,
      itemId,
      quantity,
      expectedDeliveryDate
    });
    
    const savedOrder = await newOrder.save();
    
    // Populate the references to return to client
    const populatedOrder = await PurchaseOrder.findById(savedOrder._id)
      .populate('vendorId')
      .populate('itemId');
    
    res.status(201).json(populatedOrder);
  } catch (err) {
    console.error('Error creating purchase order:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllPurchaseOrders = async (req, res) => {
  try {
    const orders = await PurchaseOrder.find()
      .populate('vendorId')
      .populate('itemId');
    res.json(orders);
  } catch (err) {
    console.error('Error fetching purchase orders:', err);
    res.status(500).json({ message: 'Server error' });
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
