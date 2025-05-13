const mongoose = require("mongoose");
const Table = require("../models/Table");
const Order = require("../models/Order");

// Controller methods for analytics operations
const analyticsController = {
  // Get analytics data
  getAnalyticsData: async (req, res) => {
    try {
      // Get restaurantId from query parameters
      const restaurantId = req.user?.restaurantId;
      const { timeRange = "all" } = req.query;
      
      if (!restaurantId) {
        return res.status(400).json({ message: "Restaurant ID is required" });
      }
      
      // Check if restaurantId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ message: "Invalid restaurant ID format" });
      }
      
      // Convert string ID to ObjectId
      const restaurantObjectId = new mongoose.Types.ObjectId(restaurantId);

      // Calculate date ranges based on timeRange
      let dateFilter = {};
      const now = new Date();

      if (timeRange === "today") {
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        dateFilter = { createdAt: { $gte: startOfDay } };
      } else if (timeRange === "week") {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0);
        dateFilter = { createdAt: { $gte: startOfWeek } };
      } else if (timeRange === "month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { createdAt: { $gte: startOfMonth } };
      }

      // Fetch all tables for this restaurant
      const tables = await Table.find({ 
        restaurantId: restaurantObjectId 
      }).sort({ tableNumber: 1 });

      // Fetch orders based on time range, status and restaurantId
      const orders = await Order.find({
        restaurantId: restaurantObjectId,
        status: { $in: ["pending", "completed"] },
        ...dateFilter,
      }).populate("waiterId");

      // Group orders by table
      const tableOrders = {};
      orders.forEach((order) => {
        const tableId = order.tableId.toString();
        if (!tableOrders[tableId]) {
          tableOrders[tableId] = [];
        }
        tableOrders[tableId].push(order);
      });

      // Extract all order items
      const allOrders = [];
      orders.forEach((order) => {
        if (order.items && order.items.length > 0) {
          // Find the table this order belongs to
          const table = tables.find(
            (t) => t._id.toString() === order.tableId.toString()
          );
          const tableNumber = table ? table.tableNumber : "Unknown";
          const tableName = table ? table.name : "Unknown";

          order.items.forEach((item) => {
            allOrders.push({
              name: item.name,
              price: item.price,
              quantity: item.quantity || 1,
              categoryName: item.categoryName || "Uncategorized",
              tableNumber: tableNumber,
              tableName: tableName,
              waiterId: order.waiterId || "Unknown",
              waiterName: order.waiterName || "Unknown",
            });
          });
        }
      });

      // Calculate most ordered items
      const itemCounts = {};
      const itemRevenue = {};
      const categoryRevenue = {};

      // Track waiter performance
      const waiterPerformance = {};

      allOrders.forEach((order) => {
        // Count by item name
        if (!itemCounts[order.name]) {
          itemCounts[order.name] = 0;
        }
        itemCounts[order.name] += order.quantity;

        // Revenue by item
        if (!itemRevenue[order.name]) {
          itemRevenue[order.name] = 0;
        }
        itemRevenue[order.name] += order.price * order.quantity;

        // Revenue by category
        if (!categoryRevenue[order.categoryName]) {
          categoryRevenue[order.categoryName] = 0;
        }
        categoryRevenue[order.categoryName] += order.price * order.quantity;

        // Track waiter performance
        const waiterId = order.waiterId || "Unknown";
        const waiterName = order.waiterName || "Unknown Staff";
        const waiterKey = `${waiterId}-${waiterName}`;

        if (!waiterPerformance[waiterKey]) {
          waiterPerformance[waiterKey] = {
            id: waiterId,
            name: waiterName,
            ordersCount: 0,
            itemsServed: 0,
            revenue: 0,
          };
        }

        // Each item contributes to the waiter's performance
        waiterPerformance[waiterKey].itemsServed += order.quantity;
        waiterPerformance[waiterKey].revenue += order.price * order.quantity;
      });

      // Process each order to track waiter performance
      orders.forEach((order) => {
        // Determine waiter information
        let waiterId = "unknown";
        let waiterName = "Unknown";

        // Check if waiterId exists and is populated
        if (order.waiterId) {
          // If waiterId is populated as an object with _id and name
          if (typeof order.waiterId === "object" && order.waiterId._id) {
            waiterId = order.waiterId._id.toString();
            waiterName = order.waiterId.name || "Unknown";
          }
          // If waiterId is just an ID string/ObjectId
          else {
            waiterId = order.waiterId.toString();
            // We don't have the name, so leave it as Unknown
          }
        }

        // Use waiterId as the key for consistency
        const waiterKey = waiterId;

        // Initialize waiter record if it doesn't exist
        if (!waiterPerformance[waiterKey]) {
          waiterPerformance[waiterKey] = {
            id: waiterId,
            name: waiterName,
            ordersCount: 0,
            itemsServed: 0,
            revenue: 0,
          };
        }

        // Only update the name if we have a better one
        if (
          waiterName !== "Unknown" &&
          waiterPerformance[waiterKey].name === "Unknown"
        ) {
          waiterPerformance[waiterKey].name = waiterName;
        }

        // Increment the order count
        waiterPerformance[waiterKey].ordersCount += 1;

        // Calculate revenue and items for this order
        let orderRevenue = 0;
        if (order.items && order.items.length > 0) {
          order.items.forEach((item) => {
            const quantity = item.quantity || 1;
            orderRevenue += item.price * quantity;
            waiterPerformance[waiterKey].itemsServed += quantity;
          });
        } else if (order.total) {
          // If no items but we have a total, use that
          orderRevenue = order.total;
        }

        // Add this order's revenue to the waiter's total
        waiterPerformance[waiterKey].revenue += orderRevenue;
      });

      // Convert waiter performance to array and sort by revenue
      const waitersData = Object.values(waiterPerformance).sort(
        (a, b) => b.revenue - a.revenue
      );

      // Convert to arrays and sort
      const popularItems = Object.entries(itemCounts)
        .map(([name, count]) => ({
          name,
          count,
          revenue: itemRevenue[name],
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Limit to top 10

      const topRevenue = Object.entries(itemRevenue)
        .map(([name, revenue]) => ({
          name,
          revenue,
          count: itemCounts[name],
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Limit to top 10

      const categoryData = Object.entries(categoryRevenue)
        .map(([category, revenue]) => ({
          category,
          revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Calculate table usage
      const tableUsage = tables
        .map((table) => {
          const tableId = table._id.toString();
          const tableOrdersList = tableOrders[tableId] || [];

          let totalItems = 0;
          let revenue = 0;

          tableOrdersList.forEach((order) => {
            if (order.items && order.items.length > 0) {
              order.items.forEach((item) => {
                totalItems += item.quantity || 1;
                revenue += item.price * (item.quantity || 1);
              });
            }
          });

          return {
            tableNumber: table.tableNumber,
            name: table.name,
            totalItems,
            revenue,
            orderCount: tableOrdersList.length,
          };
        })
        .filter((table) => table.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue);
        //.slice(0, 10); // Limit to top 10

      // Calculate total revenue and other metrics
      const totalRevenue = allOrders.reduce(
        (sum, order) => sum + order.price * order.quantity,
        0
      );
      const totalItems = allOrders.reduce(
        (sum, order) => sum + order.quantity,
        0
      );

      // Sort orders by total revenue and populate table details - use same time filter
      const sortedOrders = await Order.find({
        restaurantId: restaurantObjectId,
        ...dateFilter,
        status: "completed", // Only fetch completed orders
      })
        .sort({ total: -1 }) // Sort by total price high to low
        .limit(10) // Get only top 10
        .populate("tableId", "tableNumber name");

      const ordersWithTableInfo = sortedOrders.map((order) => {
        return {
          _id: order._id,
          tableNumber: order.tableId ? order.tableId.tableNumber : "Unknown",
          tableName: order.tableId ? order.tableId.name : "Unknown",
          waiterName: order.waiterName || "Unknown Staff",
          items: order.items,
          total: order.total,
          status: order.status,
          createdAt: order.createdAt,
        };
      });

      res.json({
        popularItems,
        topRevenue,
        categoryData,
        tableUsage,
        totalRevenue,
        totalOrders: orders.length,
        totalItems,
        sortedOrders: ordersWithTableInfo,
        waitersData, // Added waiter performance data
        timeRange: timeRange,
      });
    } catch (err) {
      console.error("Error generating analytics:", err);
      res.status(500).json({ message: "Server error: " + err.message });
    }
  },
};

module.exports = analyticsController;