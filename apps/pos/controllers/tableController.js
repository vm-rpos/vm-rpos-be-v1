const Table = require('../models/Table');
const Order = require('../models/Order');
const Section = require('../models/Section');

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
    if (!req.user || !req.user.restaurantId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const tables = await Table.find({ restaurantId: req.user.restaurantId }).sort({ tableNumber: 1 });

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
          createdAt: table.createdAt,
          updatedAt: table.updatedAt,
        };
      })
    );

    res.json(tablesWithOrderInfo);
  } catch (err) {
    console.error("Error getting tables:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new table
exports.createTable = async (req, res) => {
  try {
    const { name, tableNumber, sectionId } = req.body;

    // Validate input
    if (!name || !tableNumber || !sectionId) {
      return res.status(400).json({ message: "Table name, number, and sectionId are required" });
    }

    if (isNaN(tableNumber)) {
      return res.status(400).json({ message: "Table number must be a number" });
    }

    if (!req.user?.restaurantId) {
      return res.status(403).json({ message: "User does not have a valid restaurantId" });
    }

    // Check if section exists
    const sectionExists = await Section.findById(sectionId);
    if (!sectionExists) {
      return res.status(400).json({ message: "Section does not exist" });
    }

    // Check for duplicate table number
    const existingTable = await Table.findOne({ 
      tableNumber: parseInt(tableNumber), 
      restaurantId: req.user.restaurantId 
    });
    if (existingTable) {
      return res.status(400).json({ message: "Table number already exists for this restaurant" });
    }

    // Create new table
    const newTable = new Table({
      name,
      tableNumber: parseInt(tableNumber),
      hasOrders: false,
      restaurantId: req.user.restaurantId,
      sectionId
    });

    const savedTable = await newTable.save();
    
    res.status(201).json({
      success: true,
      data: savedTable,
      message: "Table created successfully"
    });
  } catch (err) {
    console.error("Error creating table:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error",
      error: err.message 
    });
  }
};

// Update a table
exports.updateTable = async (req, res) => {
  try {
    const { name, tableNumber, sectionId } = req.body;

    if (!name && !tableNumber && !sectionId) {
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
      waiter: waiterInfo,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt
    });
  } catch (err) {
    console.error('Error getting table:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Clear orders for a table
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