const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
const Item = require('../models/Item');

exports.createOrder = async (req, res) => {
    try {
      console.log('Received order data:', req.body); // Log incoming data for debugging
      
      const { orderType, vendorId, destination, items, expectedDeliveryDate } = req.body;
      
      // Validate order type and required fields
      if (!orderType) {
        return res.status(400).json({ message: 'Order type is required' });
      }
      
      if (orderType === 'purchaseOrder' && !vendorId) {
        return res.status(400).json({ message: 'Vendor is required for purchase orders' });
      }
      
      if ((orderType === 'saleOrder' || orderType === 'stockoutOrder') && !destination) {
        return res.status(400).json({ message: 'Destination is required for sale and stockout orders' });
      }
      
      if (!items || items.length === 0) {
        return res.status(400).json({ message: 'At least one item is required' });
      }
      
      if (!expectedDeliveryDate) {
        return res.status(400).json({ message: 'Expected delivery date is required' });
      }
      
      // Format items correctly for MongoDB
      const formattedItems = items.map(item => ({
        itemId: item.itemId,
        quantity: Number(item.quantity)
      }));
      
      console.log('Formatted items:', formattedItems); // Log formatted items
      
      // Create new order data object
      const orderData = {
        orderType,
        items: formattedItems,
        expectedDeliveryDate: new Date(expectedDeliveryDate)
      };
      
      // Only add vendorId for purchase orders
      if (orderType === 'purchaseOrder' && vendorId) {
        orderData.vendorId = vendorId;
      }
      
      // Only add destination for sale and stockout orders
      if ((orderType === 'saleOrder' || orderType === 'stockoutOrder') && destination) {
        orderData.destination = destination;
      }
      
      console.log('Final order data:', orderData); // Log final data structure
      
      // Create new order with the prepared data
      const newOrder = new Order(orderData);
      
      // Check for validation errors
      const validationError = newOrder.validateSync();
      if (validationError) {
        console.error('Validation error:', validationError);
        return res.status(400).json({ 
          message: 'Validation error', 
          error: validationError.message 
        });
      }
      
      const savedOrder = await newOrder.save();
      
      console.log('Order saved successfully:', savedOrder._id);
      
      // Return the saved order without population to minimize errors
      res.status(201).json(savedOrder);
      
    } catch (err) {
      console.error('Error creating order:', err);
      res.status(500).json({ 
        message: 'Server error', 
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  };

exports.getAllOrders = async (req, res) => {
    try {
      const orders = await Order.find()
        .populate({ 
          path: 'vendorId', 
          model: 'Vendor',
          // Add error handling for null/undefined vendors
          options: { strictPopulate: false }
        })
        .populate({ 
          path: 'items.itemId', 
          model: 'Item',
          // Add error handling for null/undefined items
          options: { strictPopulate: false }
        });
        
      res.json(orders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['pending', 'order successful', 'in transit', 'delivered'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate({ path: 'vendorId', model: 'Vendor' })
     .populate({ path: 'items.itemId', model: 'Item' });
    
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });
    
    res.json(updatedOrder);
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate({ path: 'vendorId', model: 'Vendor' })
      .populate({ path: 'items.itemId', model: 'Item' });
    
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    res.json(order);
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { orderType, vendorId, destination, items, expectedDeliveryDate } = req.body;
    
    const updateData = {};
    if (orderType) updateData.orderType = orderType;
    if (orderType === 'purchaseOrder' && vendorId) updateData.vendorId = vendorId;
    if (orderType !== 'purchaseOrder' && destination) updateData.destination = destination;
    if (items) updateData.items = items;
    if (expectedDeliveryDate) updateData.expectedDeliveryDate = expectedDeliveryDate;
    
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    ).populate({ path: 'vendorId', model: 'Vendor' })
     .populate({ path: 'items.itemId', model: 'Item' });
    
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });
    
    res.json(updatedOrder);
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    
    if (!deletedOrder) return res.status(404).json({ message: 'Order not found' });
    
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    console.error('Error deleting order:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getOrdersByType = async (req, res) => {
  try {
    const { type } = req.params;
    
    if (!['purchaseOrder', 'saleOrder', 'stockoutOrder'].includes(type)) {
      return res.status(400).json({ message: 'Invalid order type' });
    }
    
    const orders = await Order.find({ orderType: type })
      .populate({ path: 'vendorId', model: 'Vendor' })
      .populate({ path: 'items.itemId', model: 'Item' });
    
    res.json(orders);
  } catch (err) {
    console.error('Error fetching orders by type:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};