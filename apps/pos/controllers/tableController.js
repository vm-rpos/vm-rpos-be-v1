const Table = require('../models/Table');
const Order = require('../models/Order');
const Section = require('../models/Section');
const waiter = require('../models/Waiter');
const Restaurant = require('../models/Restaurant'); // Assuming you have a Restaurant model 

// Get all tables with their order information
// exports.getAllTables = async (req, res) => {
//   try {
//     const tables = await Table.find().sort({ tableNumber: 1 });

//     const tablesWithOrderInfo = await Promise.all(
//       tables.map(async (table) => {
//         const latestOrder = await Order.findOne({
//           tableId: table._id,
//           status: 'pending'
//         }).sort({ createdAt: -1 });

//         return {
//           _id: table._id,
//           name: table.name,
//           tableNumber: table.tableNumber,
//           hasOrders: !!latestOrder,
//           createdAt: table.createdAt,
//           updatedAt: table.updatedAt
//         };
//       })
//     );

//     res.json(tablesWithOrderInfo);
//   } catch (err) {
//     console.error('Error getting tables:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

//Fetching based on User's RestaurantId
exports.getAllTables = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      return res.status(403).json({ message: "Unauthorized: Restaurant ID missing in token" });
    }

    const tables = await Table.find({ restaurantId }).sort({ tableNumber: 1 });

    const tablesWithOrderInfo = await Promise.all(
      tables.map(async (table) => {
        const latestOrder = await Order.findOne({
          tableId: table._id,
          status: "pending",
        }).sort({ createdAt: -1 });

        return {
          _id: table._id,
          name: table.name,
          tableNumber: table.tableNumber,
          hasOrders: !!latestOrder,
          sectionId: table.sectionId,
          restaurantId: table.restaurantId,
          seats: table.seats,
          currentBillAmount: table.currentBillAmount || 0,
          paymentMethod: table.paymentMethod || null,
          billNumber: table.billNumber || null,
          currentOrderItems: table.currentOrderItems || [],
          firstOrderTime: table.firstOrderTime || null,
          waiter: table.waiter || null,
          createdAt: table.createdAt,
          updatedAt: table.updatedAt,
        };
      })
    );

    res.json(tablesWithOrderInfo);
  } catch (err) {
    console.error("Error getting tables:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Create a new table
exports.createTable = async (req, res) => {
  try {
    const { name, tableNumber, sectionId, seats } = req.body;

    if (!name || !tableNumber || !sectionId || !seats) {
      return res.status(400).json({ message: "Table name, number, sectionId, and seats are required" });
    }

    if (isNaN(tableNumber) || isNaN(seats)) {
      return res.status(400).json({ message: "Table number and seats must be numeric" });
    }

    if (!req.user?.restaurantId) {
      return res.status(403).json({ message: "User does not have a valid restaurantId" });
    }

    const sectionExists = await Section.findById(sectionId);
    if (!sectionExists) {
      return res.status(400).json({ message: "Section does not exist" });
    }

    // const existingTable = await Table.findOne({
    //   tableNumber: parseInt(tableNumber),
    //   restaurantId: req.user.restaurantId
    // });
    // if (existingTable) {
    //   return res.status(400).json({ message: "Table number already exists for this restaurant" });
    // }

    const newTable = new Table({
      name,
      tableNumber: parseInt(tableNumber),
      hasOrders: false,
      restaurantId: req.user.restaurantId,
      sectionId,
      seats: parseInt(seats)
    });

    const savedTable = await newTable.save();

    res.status(201).json({
      success: true,
      data: savedTable,
      message: "Table created successfully"
    });
  } catch (err) {
    console.error("Error creating table:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// Update a table
exports.updateTable = async (req, res) => {
  try {
    const { name, tableNumber, sectionId, seats } = req.body;

    if (!name && !tableNumber && !sectionId && !seats) {
      return res.status(400).json({ message: 'At least one field must be provided' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (tableNumber) {
      // const existingTable = await Table.findOne({
      //   tableNumber,
      //   _id: { $ne: req.params.id }
      // });

      // if (existingTable) {
      //   return res.status(400).json({ message: 'Table number already exists' });
      // }

      updateData.tableNumber = tableNumber;
    }

    if (sectionId) updateData.sectionId = sectionId;
    if (seats) {
      if (isNaN(seats) || seats <= 0) {
        return res.status(400).json({ message: 'Seats must be a positive number' });
      }
      updateData.seats = parseInt(seats);
    }

    const updatedTable = await Table.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedTable) return res.status(404).json({ message: 'Table not found' });

    const currentOrder = await Order.findOne({
      tableId: updatedTable._id,
      status: 'pending'
    }).sort({ createdAt: -1 });

    res.json({
      _id: updatedTable._id,
      name: updatedTable.name,
      tableNumber: updatedTable.tableNumber,
      sectionId: updatedTable.sectionId,
      seats: updatedTable.seats,
      hasOrders: !!currentOrder,
      orders: currentOrder ? currentOrder.items : [],
      createdAt: updatedTable.createdAt,
      updatedAt: updatedTable.updatedAt
    });
  } catch (err) {
    console.error('Error updating table:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a table and its orders
exports.deleteTable = async (req, res) => {
  try {
    await Order.deleteMany({ tableId: req.params.id });

    const deletedTable = await Table.findByIdAndDelete(req.params.id);
    if (!deletedTable) return res.status(404).json({ message: 'Table not found' });

    res.json({ message: 'Table and all associated orders deleted successfully' });
  } catch (err) {
    console.error('Error deleting table:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Place an order for a table
exports.placeOrder = async (req, res) => {
  try {
    const { orders, waiterId } = req.body;
    const restaurantId = req.user.restaurantId;
    const tableId = req.params.id;

    // if (!orders || !Array.isArray(orders) || orders.length === 0) {
    //   return res.status(400).json({ message: "Orders must be a non-empty array" });
    // }

    const table = await Table.findById(tableId);
    if (!table) return res.status(404).json({ message: "Table not found" });

    const section = await Section.findById(table.sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    const validatedItems = orders.map(item => ({
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity) || 1,
      categoryName: item.categoryName || "Uncategorized",
      itemId: item.itemId || null
    }));

    const additionalTotal = validatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    let waiter = null;
    let waiterObject = null;
    if (waiterId) {
      waiter = await require("../models/Waiter").findById(waiterId);
      if (!waiter) return res.status(404).json({ message: "Waiter not found" });
      
      // Create waiter object to store in table
      waiterObject = {
        _id: waiter._id,
        name: waiter.name,
        phoneNumber: waiter.phoneNumber
      };
    }

    const existingOrder = await Order.findOne({ tableId, status: "pending" });

    if (existingOrder) {
      // Update items with new ones
      existingOrder.items = validatedItems;
      existingOrder.total = validatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      existingOrder.sectionName = section.section;

      // Optionally update waiter if changed
      if (waiter) {
        existingOrder.waiterId = waiter._id;
        existingOrder.waiter = waiter.name;
      }
    
      await existingOrder.save();
    
      // Update table as well
      table.currentOrderItems = validatedItems;
      table.currentBillAmount = existingOrder.total;
      if (waiter) {
        table.waiterId = waiter._id;
        table.waiter = waiterObject; // Store waiter object in table
      }
      await table.save();
    
      return res.json({
        _id: table._id,
        name: table.name,
        tableNumber: table.tableNumber,
        hasOrders: true,
        restaurantId,
        sectionId: table.sectionId,
        currentOrderItems: validatedItems,
        currentBillAmount: existingOrder.total,
        billNumber: existingOrder.billNumber,
        waiter: waiterObject,
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
        firstOrderTime: table.firstOrderTime
      });
    }
    
    // 🆕 No existing pending order — create a new one
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const now = new Date();
    const istOffset = 330 * 60 * 1000;
    const ist = new Date(now.getTime() + istOffset);
    const [year, month, date] = [ist.getUTCFullYear(), ist.getUTCMonth() + 1, ist.getUTCDate()];

    restaurant.billTracking = restaurant.billTracking || {
      currentYear: year,
      currentMonth: month,
      currentDate: date,
      dailyOrderCounter: 0
    };

    if (
      restaurant.billTracking.currentYear !== year ||
      restaurant.billTracking.currentMonth !== month ||
      restaurant.billTracking.currentDate !== date
    ) {
      restaurant.billTracking = {
        currentYear: year,
        currentMonth: month,
        currentDate: date,
        dailyOrderCounter: 0
      };
    }

    restaurant.billTracking.dailyOrderCounter++;
    const billNumber = `${String(year).slice(-2)}${String(month).padStart(2, "0")}${String(date).padStart(2, "0")}${String(restaurant.billTracking.dailyOrderCounter).padStart(4, "0")}`;
    await restaurant.save();

    const orderData = {
      restaurantId,
      tableId,
      sectionId: table.sectionId,
      sectionName: section.section,
      items: validatedItems,
      total: additionalTotal,
      status: "pending",
      billNumber
    };

    if (waiter) {
      orderData.waiterId = waiter._id;
      orderData.waiter = waiter.name;
    }

    const newOrder = new Order(orderData);
    await newOrder.save();

    table.hasOrders = true;
    table.currentOrderItems = validatedItems;
    table.currentBillAmount = additionalTotal;
    table.billNumber = billNumber;
    table.firstOrderTime = new Date();
    if (waiter) {
      table.waiterId = waiter._id;
      table.waiter = waiterObject; // Store waiter object in table
    }

    await table.save();

    res.json({
      _id: table._id,
      name: table.name,
      tableNumber: table.tableNumber,
      hasOrders: true,
      restaurantId,
      sectionId: table.sectionId,
      currentOrderItems: validatedItems,
      currentBillAmount: additionalTotal,
      billNumber,
      waiter: waiterObject,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
      firstOrderTime: table.firstOrderTime
    });
  } catch (err) {
    console.error("Error placing order:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Delete an order by ID
exports.deleteOrderById = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    // Find the order to delete
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Delete the order
    await order.deleteOne();

    // Check if the table still has other pending orders
    const pendingOrders = await Order.find({
      tableId: order.tableId,
      status: 'pending',
    });

    // If no more pending orders, reset all table data to no order state
    if (pendingOrders.length === 0) {
      await Table.findByIdAndUpdate(order.tableId, { 
        hasOrders: false,
        currentOrderItems: [],
        currentBillAmount: 0,
        paymentMethod: null,
        billNumber: null,
        firstOrderTime: null,
        waiterId: null,
        waiter: null // Clear the waiter object
      });
    } else {
      // If there are still pending orders, update the table with the remaining order data
      // Calculate total from remaining orders
      const totalAmount = pendingOrders.reduce((sum, order) => sum + order.total, 0);
      
      // Get all items from remaining orders
      const allItems = pendingOrders.flatMap(order => order.items);
      
      // Update the table with the new totals and items
      await Table.findByIdAndUpdate(order.tableId, {
        hasOrders: true,
        currentOrderItems: allItems,
        currentBillAmount: totalAmount,
        // We keep the same waiter, firstOrderTime and billNumber
      });
    }

    res.json({ message: "Order deleted successfully", orderId });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Modified getTableById to include waiter info
exports.getTableById = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ message: 'Table not found' });

    const currentOrder = await Order.findOne({
      tableId: table._id,
      status: 'pending'
    }).sort({ createdAt: -1 }).populate('waiterId');

    let waiterInfo = null;
    if (currentOrder && currentOrder.waiterId) {
      waiterInfo = {
        _id: currentOrder.waiterId._id,
        name: currentOrder.waiterId.name,
        phoneNumber: currentOrder.waiterId.phoneNumber
      };
    }

    res.json({
      _id: table._id,
      name: table.name,
      tableNumber: table.tableNumber,
      hasOrders: !!currentOrder,
      orders: currentOrder ? currentOrder.items : [],
      seats: table.seats,
      waiter: waiterInfo,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt
    });
  } catch (err) {
    console.error('Error getting table:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Clear orders for a table removes the pending status from all orders associated with the table
exports.clearOrders = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ message: 'Table not found' });

    const { paymentMethod } = req.body;
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required' });
    }

     const billNumber = table.billNumber; // ✅ Save before clearing

    // Update all pending orders: mark as completed and set payment method
    await Order.updateMany(
      { tableId: table._id, status: 'pending' },
      { status: 'completed', paymentMethod }
    );

    // Clear all order-related fields on the table, including the waiter data
    const updatedTable = await Table.findByIdAndUpdate(
      table._id,
      {
        hasOrders: false,
        currentOrderItems: [],
        currentBillAmount: 0,
        paymentMethod: null,
        billNumber: null,
        firstOrderTime: null,
        waiterId: null,
        waiter: null // Clear the waiter object
      },
      { new: true }
    );

    // Respond with updated info, including the payment method used
    res.json({
      _id: updatedTable._id,
      name: updatedTable.name,
      tableNumber: updatedTable.tableNumber,
      hasOrders: false,
      orders: [],
      paymentMethod, // Include in response
      billNumber,
      createdAt: updatedTable.createdAt,
      updatedAt: updatedTable.updatedAt
    });
  } catch (err) {
    console.error('Error clearing orders:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
