// controllers/orderController.js
const Order = require('../models/Order');
const Table = require('../models/Table');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const mongoose = require('mongoose');
// exports.getAllOrders = async (req, res) => {
//   try {
//     // Get the time range from query parameters
//     const timeRange = req.query.timeRange || 'all';

//     // Calculate date ranges based on timeRange
//     let dateFilter = {};
//     const now = new Date();

//     if (timeRange === 'today') {
//       const startOfDay = new Date(now.setHours(0, 0, 0, 0));
//       dateFilter = { createdAt: { $gte: startOfDay } };
//     } else if (timeRange === 'week') {
//       const startOfWeek = new Date(now);
//       startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
//       startOfWeek.setHours(0, 0, 0, 0);
//       dateFilter = { createdAt: { $gte: startOfWeek } };
//     } else if (timeRange === 'month') {
//       const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//       dateFilter = { createdAt: { $gte: startOfMonth } };
//     }

//     // Fetch completed orders within the specified time range
//     const orders = await Order.find({
//       status: "completed",
//       ...dateFilter,
//     })
//       .sort({ total: -1 }) // Most recent first
//       .limit(10) // Only fetch the top 10 orders
//       .populate('tableId', 'tableNumber name'); // Get table info

//     // Transform the data to include table information
//     const ordersWithTableInfo = orders.map(order => ({
//       _id: order._id,
//       tableId: order.tableId?._id,
//       tableNumber: order.tableId?.tableNumber || "N/A",
//       tableName: order.tableId?.name || "Unknown",
//       items: order.items,
//       total: order.total,
//       status: order.status,
//       createdAt: order.createdAt
//     }));

//     res.json(ordersWithTableInfo);
//   } catch (err) {
//     console.error('Error getting orders:', err);
//     res.status(500).json({ message: 'Server error: ' + err.message });
//   }
// };

exports.getAllOrders = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;
    console.log("Extracted restaurantId from token:", restaurantId);

    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid or missing restaurant ID in token" });
    }

    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId); // <--- This line was missing

    // Time range filter logic
    const { timeRange = 'all' } = req.query;
    let dateFilter = {};
    const now = new Date();

    if (timeRange === 'today') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      dateFilter = { createdAt: { $gte: startOfDay } };
    } else if (timeRange === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: startOfWeek } };
    } else if (timeRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { $gte: startOfMonth } };
    }

    const orders = await Order.find({
      restaurantId: restaurantObjectId,
      ...dateFilter
    })
      .sort({ createdAt: -1 }) // Most recent first
      .populate("tableId", "tableNumber name");

    const ordersWithInfo = orders.map(order => ({
      _id: order._id,
      tableId: order.tableId?._id,
      tableNumber: order.tableId?.tableNumber || "N/A",
      tableName: order.tableId?.name || "Unknown",
      waiter: order.waiter,
      items: order.items,
      total: order.total,
      status: order.status,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      restaurantId: order.restaurantId,
      restaurantName: order.restaurantName,
      billNumber: order.billNumber
    }));

    res.json({
      orders: ordersWithInfo,
      pagination: {
        total: orders.length,
        page: 1,
        limit: 10,
        totalPages: 1
      },
      filters: {
        search: "",
        timeRange
      }
    });

  } catch (err) {
    console.error("Error getting orders:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};



exports.createOrder = async (req, res) => {
  try {
    const { tableId, waiterId, items, restaurantId } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ message: "Restaurant ID is required" });
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const newOrder = new Order({
      restaurantId,
      tableId,
      waiterId,
      items,
      total
    });

    await newOrder.save();

    res.status(201).json(newOrder);
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ message: "Server error" });
  }
};
