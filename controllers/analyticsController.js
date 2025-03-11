const Table = require('../models/Table');
const Order = require('../models/Order');

// Controller methods for analytics operations
const analyticsController = {
  // Get analytics data
  getAnalyticsData: async (req, res) => {
    try {
      // Fetch all tables
      const tables = await Table.find().sort({ tableNumber: 1 });
      
      // Fetch all completed orders (we want historical data for analytics)
      // For a production app, you might want to add date filtering
      const orders = await Order.find({ status: { $in: ['pending', 'completed'] } });
      
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
              tableName: tableName
            });
          });
        }
      });
      
      // Calculate most ordered items
      const itemCounts = {};
      const itemRevenue = {};
      const categoryRevenue = {};
      
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
      });
      
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
        // Get all orders for this table
        const tableId = table._id.toString();
        const tableOrdersList = tableOrders[tableId] || [];
        
        // Calculate metrics for this table
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
      }).filter(table => table.revenue > 0);  // Only include tables with revenue
      
      // Calculate total revenue and other metrics
      const totalRevenue = allOrders.reduce((sum, order) => sum + (order.price * order.quantity), 0);
      const totalItems = allOrders.reduce((sum, order) => sum + order.quantity, 0);
      
      res.json({
        popularItems,
        topRevenue,
        categoryData,
        tableUsage,
        totalRevenue,
        totalOrders: orders.length,
        totalItems
      });
    } catch (err) {
      console.error('Error generating analytics:', err);
      res.status(500).json({ message: 'Server error: ' + err.message });
    }
  }
};

module.exports = analyticsController;