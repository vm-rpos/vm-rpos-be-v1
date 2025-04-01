const IVMOrder = require('../models/IVMOrder');
const Vendor = require('../models/Vendor');
const Item = require('../models/Item');
const mongoose = require('mongoose');
const { startOfDay, startOfWeek, startOfMonth } = require('date-fns');

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
      if (!item.itemId || !item.name || !item.quantity || !item.price) {
        return res.status(400).json({ message: 'Each item must have itemId, name, quantity, and price' });
      }
    }

    // Create the order
    const newOrder = new IVMOrder({
      orderType,
      vendorId: vendorId || null,
      destination: destination || null,
      items,
      expectedDeliveryDate
    });

    // Save the order
    const savedOrder = await newOrder.save();

    // Process items based on order type
    if (orderType === 'purchaseOrder') {
      for (const item of items) {
        // Find the existing item
        const existingItem = await Item.findById(item.itemId);

        if (!existingItem) {
          return res.status(404).json({ message: `Item with ID ${item.itemId} not found` });
        }

        // Calculate new average price and total purchase value
        const newTotalQuantity = existingItem.quantity + item.quantity;
        const newTotalPurchaseValue = (existingItem.totalPurchaseValue || 0) + (item.price * item.quantity);
        const newAvgPrice = parseFloat((newTotalPurchaseValue / newTotalQuantity).toFixed(2));

        // Update item details
        await Item.findByIdAndUpdate(
          item.itemId,
          {
            $inc: { quantity: item.quantity },
            price: item.price, // Update current price to latest price
            avgPrice: newAvgPrice,
            totalPurchaseValue: newTotalPurchaseValue
          },
          { new: true }
        );
      }
    } else if (orderType === 'saleOrder' || orderType === 'stockoutOrder') {
      // Reduce item quantities for sale or stockout orders
      for (const item of items) {
        await Item.findByIdAndUpdate(
          item.itemId,
          { $inc: { quantity: -item.quantity } },
          { new: true }
        );
      }
    }

    // Populate the order
    const populatedOrder = await IVMOrder.findById(savedOrder._id)
      .populate('vendorId')
      .populate('items.itemId');

    res.status(201).json(populatedOrder);
  } catch (err) {
    console.error('Error creating IVM order:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all IVM Orders with filtering
exports.getAllIVMOrders = async (req, res) => {
  try {
    const { orderType, status, dateFilter } = req.query;
    
    // Create filter object
    const filter = {};
    
    // Filter by order type
    if (orderType) {
      filter.orderType = orderType;
    }
    
    // Filter by status
    if (status && status.toLowerCase() !== 'all') {
      filter.status = status;
    }
    
    // Apply date filtering
    if (dateFilter && dateFilter !== 'all') {
      const today = startOfDay(new Date());
      let startDate;
      
      switch (dateFilter) {
        case 'today':
          startDate = today;
          break;
        case 'this week':
          startDate = startOfWeek(today, { weekStartsOn: 1 }); // Week starts on Monday
          break;
        case 'this month':
          startDate = startOfMonth(today);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        filter.expectedDeliveryDate = { $gte: startDate };
      }
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

// Get orders by type with search, filtering, and pagination
exports.getOrdersByType = async (req, res) => {
  try {
    const { orderType } = req.params;
    const { status, dateFilter, searchTerm, page, pageSize } = req.query;
    
    if (!['purchaseOrder', 'saleOrder', 'stockoutOrder'].includes(orderType)) {
      return res.status(400).json({ message: 'Invalid order type' });
    }
    
    // Create filter object
    const filter = { orderType };
    
    // Filter by status
    if (status && status.toLowerCase() !== 'all') {
      filter.status = status;
    }
    
    // Apply date filtering
    if (dateFilter && dateFilter !== 'all') {
      const today = startOfDay(new Date());
      let startDate;
      
      switch (dateFilter) {
        case 'today':
          startDate = today;
          break;
        case 'this week':
          startDate = startOfWeek(today, { weekStartsOn: 1 }); // Week starts on Monday
          break;
        case 'this month':
          startDate = startOfMonth(today);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        filter.expectedDeliveryDate = { $gte: startDate };
      }
    }

    // Search functionality
    let searchQuery = {};
    if (searchTerm && searchTerm.trim() !== '') {
      const searchRegex = new RegExp(searchTerm.trim(), 'i');
      
      // Find vendors that match the search term
      const vendors = await Vendor.find({ name: searchRegex });
      const vendorIds = vendors.map(vendor => vendor._id);
      
      // Find items that match the search term
      const items = await Item.find({ name: searchRegex });
      const itemIds = items.map(item => item._id);
      
      searchQuery = {
        $or: [
          { vendorId: { $in: vendorIds } },
          { 'items.name': searchRegex },
          { status: searchRegex },
          { 'items.itemId': { $in: itemIds } }
        ]
      };
    }

    // Combine main filter with search query
    const finalFilter = searchTerm && searchTerm.trim() !== '' 
      ? { $and: [filter, searchQuery] } 
      : filter;
    
    // Pagination
    const currentPage = parseInt(page) || 1;
    const itemsPerPage = parseInt(pageSize) || 10;
    const skip = (currentPage - 1) * itemsPerPage;
    
    // Get total count for pagination
    const totalCount = await IVMOrder.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    
    // Get paginated orders
    const orders = await IVMOrder.find(finalFilter)
      .populate('vendorId')
      .populate('items.itemId')
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(itemsPerPage);
    
    // Return orders with pagination metadata
    res.json({
      orders,
      pagination: {
        currentPage,
        totalPages,
        totalCount,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      }
    });
  } catch (err) {
    console.error('Error fetching orders by type:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Also update the purchase stats function to include search:
exports.getPurchaseOrderStats = async (req, res) => {
  try {
    const { status, dateFilter, searchTerm } = req.query;
    
    // Create filter object
    const filter = { orderType: 'purchaseOrder' };
    
    // Filter by status
    if (status && status.toLowerCase() !== 'all') {
      filter.status = status;
    }
    
    // Apply date filtering
    if (dateFilter && dateFilter !== 'all') {
      const today = startOfDay(new Date());
      let startDate;
      
      switch (dateFilter) {
        case 'today':
          startDate = today;
          break;
        case 'this week':
          startDate = startOfWeek(today, { weekStartsOn: 1 }); // Week starts on Monday
          break;
        case 'this month':
          startDate = startOfMonth(today);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        filter.expectedDeliveryDate = { $gte: startDate };
      }
    }

    // Search functionality
    let searchQuery = {};
    if (searchTerm && searchTerm.trim() !== '') {
      const searchRegex = new RegExp(searchTerm.trim(), 'i');
      
      // Find vendors that match the search term
      const vendors = await Vendor.find({ name: searchRegex });
      const vendorIds = vendors.map(vendor => vendor._id);
      
      // Find items that match the search term
      const items = await Item.find({ name: searchRegex });
      const itemIds = items.map(item => item._id);
      
      searchQuery = {
        $or: [
          { vendorId: { $in: vendorIds } },
          { 'items.name': searchRegex },
          { status: searchRegex },
          { 'items.itemId': { $in: itemIds } }
        ]
      };
    }

    // Combine main filter with search query
    const finalFilter = searchTerm && searchTerm.trim() !== '' 
      ? { $and: [filter, searchQuery] } 
      : filter;

    // Get filtered orders
    const purchaseOrders = await IVMOrder.find(finalFilter)
      .populate('items.itemId');
    
    // Calculate statistics
    const orderCount = purchaseOrders.length;
    
    let totalItems = 0;
    let totalAmount = 0;
    
    // Calculate totals
    purchaseOrders.forEach(order => {
      order.items.forEach(item => {
        totalItems += item.quantity;
        totalAmount += item.price * item.quantity;
      });
    });
    
    res.json({
      orderCount,
      totalItems,
      totalAmount: parseFloat(totalAmount.toFixed(2))
    });
  } catch (err) {
    console.error('Error fetching purchase order statistics:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get purchase order statistics with filtering
// exports.getPurchaseOrderStats = async (req, res) => {
//   try {
//     const { status, dateFilter } = req.query;
    
//     // Create filter object
//     const filter = { orderType: 'purchaseOrder' };
    
//     // Filter by status
//     if (status && status.toLowerCase() !== 'all') {
//       filter.status = status;
//     }
    
//     // Apply date filtering
//     if (dateFilter && dateFilter !== 'all') {
//       const today = startOfDay(new Date());
//       let startDate;
      
//       switch (dateFilter) {
//         case 'today':
//           startDate = today;
//           break;
//         case 'this week':
//           startDate = startOfWeek(today, { weekStartsOn: 1 }); // Week starts on Monday
//           break;
//         case 'this month':
//           startDate = startOfMonth(today);
//           break;
//         default:
//           startDate = null;
//       }
      
//       if (startDate) {
//         filter.expectedDeliveryDate = { $gte: startDate };
//       }
//     }

//     // Get filtered orders
//     const purchaseOrders = await IVMOrder.find(filter)
//       .populate('items.itemId');
    
//     // Calculate statistics
//     const orderCount = purchaseOrders.length;
    
//     let totalItems = 0;
//     let totalAmount = 0;
    
//     // Calculate totals
//     purchaseOrders.forEach(order => {
//       order.items.forEach(item => {
//         totalItems += item.quantity;
//         totalAmount += item.price * item.quantity;
//       });
//     });
    
//     res.json({
//       orderCount,
//       totalItems,
//       totalAmount: parseFloat(totalAmount.toFixed(2))
//     });
//   } catch (err) {
//     console.error('Error fetching purchase order statistics:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// Get orders by type with date filtering
// exports.getOrdersByType = async (req, res) => {
//   try {
//     const { orderType } = req.params;
//     const { status, dateFilter } = req.query;
    
//     if (!['purchaseOrder', 'saleOrder', 'stockoutOrder'].includes(orderType)) {
//       return res.status(400).json({ message: 'Invalid order type' });
//     }
    
//     // Create filter object
//     const filter = { orderType };
    
//     // Filter by status
//     if (status && status.toLowerCase() !== 'all') {
//       filter.status = status;
//     }
    
//     // Apply date filtering
//     if (dateFilter && dateFilter !== 'all') {
//       const today = startOfDay(new Date());
//       let startDate;
      
//       switch (dateFilter) {
//         case 'today':
//           startDate = today;
//           break;
//         case 'this week':
//           startDate = startOfWeek(today, { weekStartsOn: 1 }); // Week starts on Monday
//           break;
//         case 'this month':
//           startDate = startOfMonth(today);
//           break;
//         default:
//           startDate = null;
//       }
      
//       if (startDate) {
//         filter.expectedDeliveryDate = { $gte: startDate };
//       }
//     }
    
//     const orders = await IVMOrder.find(filter)
//       .populate('vendorId')
//       .populate('items.itemId');
    
//     res.json(orders);
//   } catch (err) {
//     console.error('Error fetching orders by type:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// Get sale order statistics with filtering
exports.getSaleOrderStats = async (req, res) => {
  try {
    const { status, dateFilter } = req.query;
    
    // Create filter object
    const filter = { orderType: 'saleOrder' };
    
    // Filter by status
    if (status && status.toLowerCase() !== 'all') {
      filter.status = status;
    }
    
    // Apply date filtering
    if (dateFilter && dateFilter !== 'all') {
      const today = startOfDay(new Date());
      let startDate;
      
      switch (dateFilter) {
        case 'today':
          startDate = today;
          break;
        case 'this week':
          startDate = startOfWeek(today, { weekStartsOn: 1 }); // Week starts on Monday
          break;
        case 'this month':
          startDate = startOfMonth(today);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        filter.expectedDeliveryDate = { $gte: startDate };
      }
    }

    // Get filtered orders
    const saleOrders = await IVMOrder.find(filter)
      .populate('items.itemId');
    
    // Calculate statistics
    const orderCount = saleOrders.length;
    
    let totalItems = 0;
    let totalAmount = 0;
    
    // Calculate totals
    saleOrders.forEach(order => {
      order.items.forEach(item => {
        totalItems += item.quantity;
        totalAmount += item.price * item.quantity;
      });
    });
    
    res.json({
      orderCount,
      totalItems,
      totalAmount: parseFloat(totalAmount.toFixed(2))
    });
  } catch (err) {
    console.error('Error fetching sale order statistics:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get stockout order statistics with filtering
exports.getStockoutOrderStats = async (req, res) => {
  try {
    const { status, dateFilter } = req.query;
    
    // Create filter object
    const filter = { orderType: 'stockoutOrder' };
    
    // Filter by status
    if (status && status.toLowerCase() !== 'all') {
      filter.status = status;
    }
    
    // Apply date filtering
    if (dateFilter && dateFilter !== 'all') {
      const today = startOfDay(new Date());
      let startDate;
      
      switch (dateFilter) {
        case 'today':
          startDate = today;
          break;
        case 'this week':
          startDate = startOfWeek(today, { weekStartsOn: 1 }); // Week starts on Monday
          break;
        case 'this month':
          startDate = startOfMonth(today);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        filter.expectedDeliveryDate = { $gte: startDate };
      }
    }

    // Get filtered orders
    const stockoutOrders = await IVMOrder.find(filter)
      .populate('items.itemId');
    
    // Calculate statistics
    const orderCount = stockoutOrders.length;
    
    let totalItems = 0;
    let totalAmount = 0;
    
    // Calculate totals
    stockoutOrders.forEach(order => {
      order.items.forEach(item => {
        totalItems += item.quantity;
        totalAmount += item.price * item.quantity;
      });
    });
    
    res.json({
      orderCount,
      totalItems,
      totalAmount: parseFloat(totalAmount.toFixed(2))
    });
  } catch (err) {
    console.error('Error fetching stockout order statistics:', err);
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

    // Find the existing order to compare item quantities
    const existingOrder = await IVMOrder.findById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ message: 'IVM order not found' });
    }

    const updateData = {};
    if (orderType) updateData.orderType = orderType;
    if (vendorId) updateData.vendorId = vendorId;
    if (destination) updateData.destination = destination;
    if (expectedDeliveryDate) updateData.expectedDeliveryDate = expectedDeliveryDate;
    if (status) updateData.status = status;

    // Update order items and quantities
    if (items) {
      updateData.items = items;

      // Only adjust quantities for purchase orders
      if (existingOrder.orderType === 'purchaseOrder') {
        // Revert previous quantities
        for (const existingItem of existingOrder.items) {
          await Item.findByIdAndUpdate(
            existingItem.itemId,
            { $inc: { quantity: -existingItem.quantity } }
          );
        }

        // Add new quantities
        for (const item of items) {
          await Item.findByIdAndUpdate(
            item.itemId,
            { $inc: { quantity: item.quantity } },
            { new: true }
          );
        }
      }
    }

    const updatedOrder = await IVMOrder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

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

exports.getOrderCounts = async (req, res) => {
  try {
    const purchaseCount = await IVMOrder.countDocuments({ orderType: 'purchaseOrder' });
    const saleCount = await IVMOrder.countDocuments({ orderType: 'saleOrder' });
    const stockoutCount = await IVMOrder.countDocuments({ orderType: 'stockoutOrder' });

    res.json({ purchase: purchaseCount, sale: saleCount, stockout: stockoutCount });
  } catch (error) {
    console.error('Error fetching order counts:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getOrderValues = async (req, res) => {
  try {
    const orders = await IVMOrder.find();

    const orderValues = {
      purchaseOrder: 0,
      saleOrder: 0,
      stockoutOrder: 0
    };

    orders.forEach(order => {
      const totalOrderValue = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      if (order.orderType in orderValues) {
        orderValues[order.orderType] += totalOrderValue;
      }
    });

    res.json(orderValues);
  } catch (error) {
    res.status(500).json({ message: 'Error calculating order values', error });
  }
};