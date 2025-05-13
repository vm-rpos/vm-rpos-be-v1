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

    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid or missing restaurant ID in token" });
    }

    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    const {
      timeRange = 'today',
      search = '',
      page = 1,
      limit = 10,
      startDateTime,
      endDateTime
    } = req.query;

    const currentPage = parseInt(page);
    const itemsPerPage = parseInt(limit);
    const skip = (currentPage - 1) * itemsPerPage;

    let createdAtFilter = {};

    // Custom date range overrides timeRange
    if (startDateTime || endDateTime) {
      const start = startDateTime ? new Date(startDateTime) : new Date(0); // default to epoch if missing
      const end = endDateTime ? new Date(endDateTime) : new Date();       // default to now if missing

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date format for startDateTime or endDateTime" });
      }

      createdAtFilter = { $gte: start, $lte: end };
    } else {
      const now = new Date();
      if (timeRange === 'today') {
        const start = new Date(now.setHours(0, 0, 0, 0));
        createdAtFilter = { $gte: start };
      } else if (timeRange === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        createdAtFilter = { $gte: start };
      } else if (timeRange === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        createdAtFilter = { $gte: start };
      } else if (timeRange === 'year') {
        const start = new Date(now.getFullYear(), 0, 1);
        createdAtFilter = { $gte: start };
      }
    }

    const matchStage = {
      restaurantId: restaurantObjectId,
      ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {})
    };

    const searchRegex = new RegExp(search, 'i');
    const isNumericSearch = !isNaN(search) && search !== '';

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'tables',
          localField: 'tableId',
          foreignField: '_id',
          as: 'table'
        }
      },
      { $unwind: { path: "$table", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'restaurants',
          localField: 'restaurantId',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      { $unwind: { path: "$restaurant", preserveNullAndEmptyArrays: true } },
      ...(search
        ? [{
            $match: {
              $or: [
                { waiter: { $regex: searchRegex } },
                { billNumber: { $regex: searchRegex } },
                { paymentMethod: { $regex: searchRegex } },
                { status: { $regex: searchRegex } },
                { "table.name": { $regex: searchRegex } },
                { "table.tableNumber": { $regex: searchRegex } },
                ...(isNumericSearch
                  ? [
                      { total: Number(search) },
                      { "items.price": Number(search) }
                    ]
                  : [])
              ]
            }
          }]
        : []
      ),
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: itemsPerPage }],
          totalCount: [{ $count: "count" }]
        }
      }
    ];

    const result = await Order.aggregate(pipeline);
    const orders = result[0]?.data || [];
    const totalCount = result[0]?.totalCount[0]?.count || 0;

    const ordersWithInfo = orders.map(order => ({
      _id: order._id,
      tableId: order.table?._id,
      tableNumber: order.table?.tableNumber || "N/A",
      tableName: order.table?.name || "Unknown",
      section: order.sectionName || "Unknown",
      waiter: order.waiter,
      items: order.items,
      total: order.total,
      status: order.status,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      restaurantId: order.restaurant?._id || order.restaurantId,
      restaurantName: order.restaurant?.name || "Unknown",
      billNumber: order.billNumber
    }));

    res.json({
      orders: ordersWithInfo,
      pagination: {
        total: totalCount,
        page: currentPage,
        limit: itemsPerPage,
        totalPages: Math.ceil(totalCount / itemsPerPage)
      },
      filters: {
        search,
        timeRange,
        startDateTime,
        endDateTime
      }
    });
  } catch (err) {
    console.error("Error getting orders:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

exports.getOrderMetrics = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;

    const {timeRange = "all", startDateTime, endDateTime, customStartDate, customEndDate } = req.query;

    if (!restaurantId) {
      return res.status(400).json({ message: "Restaurant ID is required" });
    }

    // Validate the restaurantId
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurant ID format" });
    }

    const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);
    let dateFilter = {};
    const now = new Date();

    // Date range filter logic (similar to your original code)
    if (startDateTime && endDateTime) {
      const start = new Date(startDateTime);
      const end = new Date(endDateTime);
      dateFilter = { createdAt: { $gte: start, $lte: end } };
    } else if (timeRange === "custom" && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      dateFilter = { createdAt: { $gte: start, $lte: end } };
    } else if (timeRange === "today") {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: startOfDay } };
    } else if (timeRange === "yesterday") {
      const startOfYesterday = new Date(now);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      startOfYesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date(now);
      endOfYesterday.setDate(endOfYesterday.getDate() - 1);
      endOfYesterday.setHours(23, 59, 59, 999);
      dateFilter = { createdAt: { $gte: startOfYesterday, $lte: endOfYesterday } };
    } else if (timeRange === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: startOfWeek } };
    } else if (timeRange === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { $gte: startOfMonth } };
    } else if (timeRange === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      startOfYear.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: startOfYear } };
    }

    // Base query
    const baseQuery = {
      restaurantId: restaurantObjectId,
      ...dateFilter
    };

    // Calculate total orders
    const totalOrders = await Order.countDocuments(baseQuery);

    // Calculate total revenue
    const revenueResult = await Order.aggregate([
      { $match: baseQuery },
      { $group: { _id: null, totalRevenue: { $sum: "$total" } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0.00";

    // Calculate total items sold
    const itemsResult = await Order.aggregate([
      { $match: baseQuery },
      { $unwind: "$items" },
      { $group: { _id: null, totalItems: { $sum: "$items.quantity" } } }
    ]);
    const totalItemsSold = itemsResult.length > 0 ? itemsResult[0].totalItems : 0;

    // Return the metrics
    res.json({
      metrics: {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        totalItemsSold
      },
      timeRange
    });
  } catch (err) {
    console.error("Error calculating order metrics:", err);
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
