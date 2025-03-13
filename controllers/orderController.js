// controllers/orderController.js
const Order = require('../models/Order');
const Table = require('../models/Table');

// Get all orders
exports.getAllOrders= async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 }) // Most recent first
      .populate('tableId', 'tableNumber name'); // Get table info
    
    // Transform the data to include table information
    const ordersWithTableInfo = orders.map(order => {
      return {
        _id: order._id,
        tableId: order.tableId._id,
        tableNumber: order.tableId.tableNumber,
        tableName: order.tableId.name,
        items: order.items,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt
      };
    });
    
    res.json(ordersWithTableInfo);
  } catch (err) {
    console.error('Error getting orders:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
}