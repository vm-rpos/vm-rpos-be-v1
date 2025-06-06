const Waiter = require('../models/Waiter');
const mongoose = require('mongoose');
const Table=require('../models/Table');
const section=require('../models/Section')

// Get all waiters
// exports.getAllWaiters = async (req, res) => {
//   try {
//     const waiters = await Waiter.find().sort({ createdAt: -1 });
//     res.json(waiters);
//   } catch (err) {
//     console.error('Error fetching waiters:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

//Get all waiters based on User's RestaurantId
exports.getAllWaiters = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ message: "Restaurant ID is required" });
    }

    // Check if restaurantId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurant ID format" });
    }

    const objectId = new mongoose.Types.ObjectId(restaurantId);
    const waiters = await Waiter.find({ restaurantId: objectId }).sort({ createdAt: -1 });

    res.json(waiters);
  } catch (err) {
    console.error("Error fetching waiters:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Create a new waiter
exports.createWaiter = async (req, res) => {
  try {
    const { name, age, phoneNumber ,tables } = req.body;

    if (!name || !age || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Ensure the request is authenticated and contains the restaurantId
    if (!req.user || !req.user.restaurantId) {
      return res.status(403).json({ message: "Unauthorized: No restaurant assigned" });
    }

    // Check if phone number already exists
    const existingWaiter = await Waiter.findOne({ phoneNumber });
    if (existingWaiter) {
      return res.status(400).json({ message: "Phone number already exists" });
    }

    const newWaiter = new Waiter({
      name,
      age,
      phoneNumber,
      restaurantId: req.user.restaurantId, // Assign the logged-in user's restaurantId

    });

    await newWaiter.save();
    res.status(201).json(newWaiter);
  } catch (err) {
    console.error("Error creating waiter:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a single waiter by ID
exports.getWaiterById = async (req, res) => {
  try {
    const waiter = await Waiter.findById(req.params.id);
    if (!waiter) return res.status(404).json({ message: 'Waiter not found' });

    res.json(waiter);
  } catch (err) {
    console.error('Error fetching waiter:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a waiter
exports.updateWaiter = async (req, res) => {
  try {
    const { name, age, phoneNumber } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (age) updateData.age = age;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;

    const updatedWaiter = await Waiter.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedWaiter) return res.status(404).json({ message: 'Waiter not found' });

    res.json(updatedWaiter);
  } catch (err) {
    console.error('Error updating waiter:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a waiter
exports.deleteWaiter = async (req, res) => {
  try {
    const deletedWaiter = await Waiter.findByIdAndDelete(req.params.id);
    if (!deletedWaiter) return res.status(404).json({ message: 'Waiter not found' });

    res.json({ message: 'Waiter deleted successfully' });
  } catch (err) {
    console.error('Error deleting waiter:', err);
    res.status(500).json({ message: 'Server error' });
  }
};



exports.getAllWaitersWithTables = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      return res
        .status(403)
        .json({ message: "Unauthorized: Restaurant ID missing in token" });
    }

    // Get all waiters for the restaurant
    const waiters = await Waiter.find({ restaurantId });

    const waitersWithTables = await Promise.all(
      waiters.map(async (waiter) => {
        // Get all tables assigned to this waiter
        const tables = await Table.find({ 
          restaurantId, 
          waiterId: waiter._id 
        }).populate('sectionId', 'section');

        // Group tables by section
        const sectionGroups = {};
        
        for (const table of tables) {
          const sectionName = table.sectionId?.section || 'No Section';
          
          if (!sectionGroups[sectionName]) {
            sectionGroups[sectionName] = [];
          }

          // Calculate total amount for current order items
          const totalItemsAmount = table.currentOrderItems?.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
          }, 0) || 0;

          sectionGroups[sectionName].push({
            tableName: table.name,
            tableNumber: table.tableNumber,
            amount: table.currentBillAmount || totalItemsAmount,
            seats:table.seats,
            firstOrderTime: table.firstOrderTime
          });
        }

        return {

          waiterId: waiter._id,
          name: waiter.name,
          phone: waiter.phoneNumber,
          age: waiter.age,
          noOfTablesAllotted: tables.length,
          sections: sectionGroups
          
        };
      })
    );

    res.json(waitersWithTables);
  } catch (err) {
    console.error("Error getting waiters with tables:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};