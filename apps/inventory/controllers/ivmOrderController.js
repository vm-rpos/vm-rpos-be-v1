const IVMOrder = require('../models/IVMOrder');
const Vendor = require('../models/Vendor');
const Item = require('../models/Item');

// Create an IVM Order
exports.createIVMOrder = async (req, res) => {
  try {
    const { orderType, vendorId, destination, items, expectedDeliveryDate } = req.body;
    
    // Validate required fields based on order type
    if (orderType === 'purchaseOrder' && !vendorId) {
      return res.status(400).json({ message: 'Vendor is required for purchase orders' });
    }
    
    if ((orderType === 'saleOrder' || orderType === 'stockoutOrder') && !destination) {
      return res.status(400).json({ message: 'Destination is required for sale or stockout orders' });
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }
    
    // Validate each item
    for (const item of items) {
      if (!item.itemId || !item.name || !item.quantity) {
        return res.status(400).json({ 
          message: 'Each item must have itemId, name, and quantity' 
        });
      }
    }
    
    const newOrder = new IVMOrder({
      orderType,
      vendorId: vendorId || null,
      destination: destination || null,
      items,
      expectedDeliveryDate
    });
    
    const savedOrder = await newOrder.save();
    
    const populatedOrder = await IVMOrder.findById(savedOrder._id)
      .populate('vendorId')
      .populate('items.itemId');
    
    res.status(201).json(populatedOrder);
  } catch (err) {
    console.error('Error creating IVM order:', err);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
  }
};

// Get all IVM Orders
exports.getAllIVMOrders = async (req, res) => {
  try {
    const { orderType } = req.query;
    
    // Create filter object
    const filter = {};
    if (orderType) {
      filter.orderType = orderType;
    }
    
    const orders = await IVMOrder.find(filter)
      .populate('vendorId')
      .populate('items.itemId');
    res.json(orders);
  } catch (err) {
    console.error('Error fetching IVM orders:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get orders by type
exports.getOrdersByType = async (req, res) => {
  try {
    const { orderType } = req.params;
    
    if (!['purchaseOrder', 'saleOrder', 'stockoutOrder'].includes(orderType)) {
      return res.status(400).json({ message: 'Invalid order type' });
    }
    
    const orders = await IVMOrder.find({ orderType })
      .populate('vendorId')
      .populate('items.itemId');
    
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders by type:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update IVM Order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['order successful', 'in transit', 'delivered'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const updatedOrder = await IVMOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!updatedOrder) return res.status(404).json({ message: 'IVM order not found' });
    
    res.json(updatedOrder);
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a single IVM Order by ID
exports.getIVMOrderById = async (req, res) => {
  try {
    const order = await IVMOrder.findById(req.params.id)
      .populate('vendorId')
      .populate('items.itemId');
    
    if (!order) return res.status(404).json({ message: 'IVM order not found' });
    
    res.json(order);
  } catch (err) {
    console.error('Error fetching IVM order:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update an IVM Order
exports.updateIVMOrder = async (req, res) => {
  try {
    const { orderType, vendorId, destination, items, expectedDeliveryDate, status } = req.body;
    
    const updateData = {};
    if (orderType) updateData.orderType = orderType;
    if (vendorId) updateData.vendorId = vendorId;
    if (destination) updateData.destination = destination;
    if (items) updateData.items = items;
    if (expectedDeliveryDate) updateData.expectedDeliveryDate = expectedDeliveryDate;
    if (status) updateData.status = status;
    
    const updatedOrder = await IVMOrder.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    if (!updatedOrder) return res.status(404).json({ message: 'IVM order not found' });
    
    res.json(updatedOrder);
  } catch (err) {
    console.error('Error updating IVM order:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete an IVM Order
exports.deleteIVMOrder = async (req, res) => {
  try {
    const deletedOrder = await IVMOrder.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ message: 'IVM order not found' });
    
    res.json({ message: 'IVM order deleted successfully' });
  } catch (err) {
    console.error('Error deleting IVM order:', err);
    res.status(500).json({ message: 'Server error' });
  }
};