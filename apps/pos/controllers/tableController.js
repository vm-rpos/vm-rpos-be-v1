const Table = require('../models/Table');
const Order = require('../models/Order');
const Section = require('../models/Section');
const waiter = require('../models/Waiter');

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

exports.getTablesBySection = async (req, res) => {
  try {
    const restaurantId = req.params.restaurantId;

    // Get all sections for the restaurant
    const sections = await Section.find({ restaurantId }).select('section').lean();;

    const responseData = [];

    for (const section of sections) {
      const tables = await Table.find({ restaurantId, sectionId: section._id })
      .populate({ path: 'waiterId', select: 'name', strictPopulate: false })
        .lean();

      const tableData = [];

      for (const table of tables) {
        const latestOrder = await Order.findOne({ tableId: table._id })
          .sort({ createdAt: -1 }) // get latest order if multiple
          .lean();

        const totalItems = latestOrder?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

        tableData.push({
          tableNumber: table.tableNumber,
          tableName: table.name,
          waiter: table.waiterId?.name || null,
          seats: table.seats,
          billingPrice: latestOrder?.total || 0,
          orderTime: latestOrder?.createdAt || null,
          totalItems,
        });
      }

      responseData.push({
        sectionName: section.section,
        sectionId: section._id,
        tables: tableData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching table-section data:", error);
    return res.status(500).json({ error: "Internal server error" });
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

    const existingTable = await Table.findOne({
      tableNumber: parseInt(tableNumber),
      restaurantId: req.user.restaurantId
    });
    if (existingTable) {
      return res.status(400).json({ message: "Table number already exists for this restaurant" });
    }

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
      const existingTable = await Table.findOne({
        tableNumber,
        _id: { $ne: req.params.id }
      });

      if (existingTable) {
        return res.status(400).json({ message: 'Table number already exists' });
      }

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
    const { orders, waiterId, restaurantId } = req.body;
    console.log("Order request body:", req.body);

    // Validate orders
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ message: "Orders must be a non-empty array" });
    }

    // Find the table (which includes sectionId)
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ message: "Table not found" });

    // Ensure restaurantId is present (either from request or table)
    const finalRestaurantId = restaurantId || table.restaurantId;
    if (!finalRestaurantId) {
      return res.status(400).json({ message: "restaurantId is required" });
    }

    // Validate waiter ID if provided
    if (waiterId) {
      const waiter = await require("../models/Waiter").findById(waiterId);
      if (!waiter) {
        return res.status(404).json({ message: "Waiter not found" });
      }
    }

    // Validate order items
    const validatedItems = orders.map((item) => ({
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity) || 1,
      categoryName: item.categoryName || "Uncategorized",
      itemId: item.itemId || null,
    }));

    // Calculate total order amount
    const total = validatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Find an existing order for the table (pending status)
    let existingOrder = await Order.findOne({ tableId: table._id, status: "pending" });

    if (existingOrder) {
      // Update existing order
      existingOrder.items = validatedItems;
      existingOrder.total = total;
      existingOrder.restaurantId = finalRestaurantId;
      existingOrder.sectionId = table.sectionId; // <-- Include sectionId

      if (waiterId) {
        existingOrder.waiterId = waiterId;
      }

      await existingOrder.save();
    } else {
      // Create new order (include sectionId)
      const orderData = {
        restaurantId: finalRestaurantId,
        tableId: table._id,
        sectionId: table.sectionId, // <-- Include sectionId
        items: validatedItems,
        total,
        status: "pending",
      };

      if (waiterId) {
        orderData.waiterId = waiterId;
      }

      existingOrder = new Order(orderData);
      await existingOrder.save();
    }

    // Update table status
    table.hasOrders = true;
    await table.save();

    // Populate waiter info if available
    if (existingOrder.waiterId) {
      await existingOrder.populate("waiterId");
    }

    res.json({
      _id: table._id,
      name: table.name,
      tableNumber: table.tableNumber,
      hasOrders: true,
      restaurantId: finalRestaurantId,
      sectionId: table.sectionId, // <-- Return sectionId in response
      orders: existingOrder.items,
      waiter: existingOrder.waiterId
        ? {
            _id: existingOrder.waiterId._id,
            name: existingOrder.waiterId.name,
            phoneNumber: existingOrder.waiterId.phoneNumber,
          }
        : null,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
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

    // If no more pending orders, set hasOrders to false
    if (pendingOrders.length === 0) {
      await Table.findByIdAndUpdate(order.tableId, { hasOrders: false });
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

    await Order.updateMany({ tableId: table._id, status: 'pending' }, { status: 'completed' });

    table.hasOrders = false;
    await table.save();

    res.json({
      _id: table._id,
      name: table.name,
      tableNumber: table.tableNumber,
      hasOrders: false,
      orders: [],
      createdAt: table.createdAt,
      updatedAt: table.updatedAt
    });
  } catch (err) {
    console.error('Error clearing orders:', err);
    res.status(500).json({ message: 'Server error' });
  }
};