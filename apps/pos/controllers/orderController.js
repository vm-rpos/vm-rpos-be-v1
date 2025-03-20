// controllers/orderController.js
const Order = require('../models/Order');
const Table = require('../models/Table');

exports.getAllOrders = async (req, res) => {
  try {
    // Get the time range from query parameters
    const timeRange = req.query.timeRange || 'all';

    // Calculate date ranges based on timeRange
    let dateFilter = {};
    const now = new Date();

    if (timeRange === 'today') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      dateFilter = { createdAt: { $gte: startOfDay } };
    } else if (timeRange === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: startOfWeek } };
    } else if (timeRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { $gte: startOfMonth } };
    }

    // Fetch completed orders within the specified time range
    const orders = await Order.find({
      status: "completed",
      ...dateFilter,
    })
      .sort({ createdAt: -1 }) // Most recent first
      .limit(10) // Only fetch the top 10 orders
      .populate('tableId', 'tableNumber name'); // Get table info

    // Transform the data to include table information
    const ordersWithTableInfo = orders.map(order => ({
      _id: order._id,
      tableId: order.tableId?._id,
      tableNumber: order.tableId?.tableNumber || "N/A",
      tableName: order.tableId?.name || "Unknown",
      items: order.items,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt
    }));

    res.json(ordersWithTableInfo);
  } catch (err) {
    console.error('Error getting orders:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};
