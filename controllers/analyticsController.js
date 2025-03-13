const Table = require('../models/Table');
const Order = require('../models/Order');

// Controller methods for analytics operations
const analyticsController = {
  // Get analytics data
  getAnalyticsData: async (req, res) => {
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
      
      // Fetch all tables
      const tables = await Table.find().sort({ tableNumber: 1 });
      
      // Fetch orders based on time range and status
      const orders = await Order.find({ 
        status: { $in: ['pending', 'completed'] },
        ...dateFilter
      });
      
      // Group orders by table
      const tableOrders = {};
      orders.forEach(order => {
        const tableId = order.tableId.toString();
        if (!tableOrders[tableId]) {
          tableOrders[tableId] = [];
        }
        tableOrders[tableId].push(order);
      });
      
      // Extract all order items
      const allOrders = [];
      orders.forEach(order => {
        if (order.items && order.items.length > 0) {
          // Find the table this order belongs to
          const table = tables.find(t => t._id.toString() === order.tableId.toString());
          const tableNumber = table ? table.tableNumber : 'Unknown';
          const tableName = table ? table.name : 'Unknown';
          
          order.items.forEach(item => {
            allOrders.push({
              name: item.name,
              price: item.price,
              quantity: item.quantity || 1,
              categoryName: item.categoryName || 'Uncategorized',
              tableNumber: tableNumber,
              tableName: tableName,
              waiterId: order.waiterId || 'Unknown',
              waiterName: order.waiterName || 'Unknown'
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
      
      allOrders.forEach(order => {
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
        const waiterId = order.waiterId || 'Unknown';
        const waiterName = order.waiterName || 'Unknown Staff';
        const waiterKey = `${waiterId}-${waiterName}`;
        
        if (!waiterPerformance[waiterKey]) {
          waiterPerformance[waiterKey] = {
            id: waiterId,
            name: waiterName,
            ordersCount: 0,
            itemsServed: 0,
            revenue: 0
          };
        }
        
        // Each item contributes to the waiter's performance
        waiterPerformance[waiterKey].itemsServed += order.quantity;
        waiterPerformance[waiterKey].revenue += order.price * order.quantity;
      });
      
      // Count unique orders per waiter
      orders.forEach(order => {
        const waiterId = order.waiterId || 'Unknown';
        const waiterName = order.waiterName || 'Unknown Staff';
        const waiterKey = `${waiterId}-${waiterName}`;
        
        if (waiterPerformance[waiterKey]) {
          waiterPerformance[waiterKey].ordersCount += 1;
        }
      });
      
      // Convert waiter performance to array and sort by revenue
      const waitersData = Object.values(waiterPerformance)
        .sort((a, b) => b.revenue - a.revenue);
      
      // Convert to arrays and sort
      const popularItems = Object.entries(itemCounts)
        .map(([name, count]) => ({ 
          name, 
          count, 
          revenue: itemRevenue[name] 
        }))
        .sort((a, b) => b.count - a.count);
      
      const topRevenue = Object.entries(itemRevenue)
        .map(([name, revenue]) => ({ 
          name, 
          revenue, 
          count: itemCounts[name] 
        }))
        .sort((a, b) => b.revenue - a.revenue);
      
      const categoryData = Object.entries(categoryRevenue)
        .map(([category, revenue]) => ({ 
          category, 
          revenue 
        }))
        .sort((a, b) => b.revenue - a.revenue);
      
      // Calculate table usage
      const tableUsage = tables.map(table => {
        const tableId = table._id.toString();
        const tableOrdersList = tableOrders[tableId] || [];
        
        let totalItems = 0;
        let revenue = 0;
        
        tableOrdersList.forEach(order => {
          if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
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
          orderCount: tableOrdersList.length
        };
      }).filter(table => table.revenue > 0);
      
      // Calculate total revenue and other metrics
      const totalRevenue = allOrders.reduce((sum, order) => sum + (order.price * order.quantity), 0);
      const totalItems = allOrders.reduce((sum, order) => sum + order.quantity, 0);
      
      // Sort orders by total revenue and populate table details - use same time filter
      const sortedOrders = await Order.find(dateFilter)
        .sort({ total: -1 })
        .populate('tableId', 'tableNumber name');
      
      const ordersWithTableInfo = sortedOrders.map(order => {
        return {
          _id: order._id,
          tableNumber: order.tableId ? order.tableId.tableNumber : 'Unknown',
          tableName: order.tableId ? order.tableId.name : 'Unknown',
          waiterName: order.waiterName || 'Unknown Staff',
          items: order.items,
          total: order.total,
          status: order.status,
          createdAt: order.createdAt
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
        timeRange: timeRange
      });
    } catch (err) {
      console.error('Error generating analytics:', err);
      res.status(500).json({ message: 'Server error: ' + err.message });
    }
  }
};

module.exports = analyticsController;