const Waiter = require('../models/Waiter');
const mongoose = require('mongoose');
const Table=require('../models/Table');
const section=require('../models/Section')
const User=require('../models/User')

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
    const restaurantId = req.user?.restaurantId;

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
// Update a waiter
exports.updateWaiter = async (req, res) => {
  try {
    const { name, age, phoneNumber } = req.body;

    // First, find the waiter record
    const waiterToUpdate = await Waiter.findById(req.params.id);
    if (!waiterToUpdate) {
      return res.status(404).json({ message: 'Waiter not found' });
    }

    // Check if phone number is being updated and if it already exists
    if (phoneNumber && phoneNumber !== waiterToUpdate.phoneNumber) {
      const existingWaiter = await Waiter.findOne({ 
        phoneNumber: phoneNumber,
        _id: { $ne: req.params.id } // Exclude current waiter
      });
      if (existingWaiter) {
        return res.status(400).json({ message: "Phone number already exists" });
      }
    }

    // Prepare update data for waiter
    const waiterUpdateData = {};
    if (name) waiterUpdateData.name = name;
    if (age) waiterUpdateData.age = age;
    if (phoneNumber) waiterUpdateData.phoneNumber = phoneNumber;

    // Update the waiter record
    const updatedWaiter = await Waiter.findByIdAndUpdate(
      req.params.id, 
      waiterUpdateData, 
      { new: true }
    );

    // Find and update the corresponding user record
    let updatedUser = null;
    let userToUpdate = null;

    // Try to find user by userId first (if the field exists in waiter record)
    if (waiterToUpdate.userId) {
      userToUpdate = await User.findById(waiterToUpdate.userId);
    } else {
      // Fallback: find user by phone number and waiter role
      userToUpdate = await User.findOne({ 
        phonenumber: waiterToUpdate.phoneNumber,
        role: 'waiter'
      });
    }

    if (userToUpdate) {
      // Prepare update data for user
      const userUpdateData = {};
      
      // Update phone number if provided
      if (phoneNumber) {
        userUpdateData.phonenumber = phoneNumber;
      }
      
      // Update name if provided - split name into firstname and lastname
      if (name) {
        const nameParts = name.trim().split(' ');
        if (nameParts.length >= 2) {
          userUpdateData.firstname = nameParts[0];
          userUpdateData.lastname = nameParts.slice(1).join(' ');
        } else {
          userUpdateData.firstname = nameParts[0];
          userUpdateData.lastname = ''; // Set empty if only one name part
        }
      }

      // Update user record if there's data to update
      if (Object.keys(userUpdateData).length > 0) {
        updatedUser = await User.findByIdAndUpdate(
          userToUpdate._id,
          userUpdateData,
          { new: true }
        );
        console.log(`Updated waiter and corresponding user: ${updatedUser.email}`);
      }
    } else {
      console.log(`Waiter updated but no corresponding user found with phone: ${waiterToUpdate.phoneNumber}`);
    }

    // Prepare response
    const response = {
      message: updatedUser ? 
        'Waiter and associated user account updated successfully' : 
        'Waiter updated successfully (no corresponding user account found)',
      waiter: updatedWaiter
    };

    // Add user info to response if user was updated
    if (updatedUser) {
      response.user = {
        userId: updatedUser._id,
        email: updatedUser.email,
        firstname: updatedUser.firstname,
        lastname: updatedUser.lastname,
        phonenumber: updatedUser.phonenumber
      };
    }

    res.json(response);

  } catch (err) {
    console.error('Error updating waiter and user:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a waiter
exports.deleteWaiter = async (req, res) => {
  try {
    // First, find the waiter record
    const waiterToDelete = await Waiter.findById(req.params.id);
    if (!waiterToDelete) {
      return res.status(404).json({ message: 'Waiter not found' });
    }

    // Find the corresponding user record using userId (if it exists) or phone number
    let userToDelete = null;
    
    // Try to find user by userId first (if the field exists in waiter record)
    if (waiterToDelete.userId) {
      userToDelete = await User.findById(waiterToDelete.userId);
    } else {
      // Fallback: find user by phone number and waiter role
      userToDelete = await User.findOne({ 
        phonenumber: waiterToDelete.phoneNumber,
        role: 'waiter'
      });
    }

    // Delete the waiter record
    const deletedWaiter = await Waiter.findByIdAndDelete(req.params.id);

    // Delete the corresponding user record if found
    if (userToDelete) {
      await User.findByIdAndDelete(userToDelete._id);
      console.log(`Deleted waiter and corresponding user: ${userToDelete.email}`);
      
      res.json({ 
        message: 'Waiter and associated user account deleted successfully',
        deletedWaiter: {
          waiterId: deletedWaiter._id,
          name: deletedWaiter.name,
          phoneNumber: deletedWaiter.phoneNumber
        },
        deletedUser: {
          userId: userToDelete._id,
          email: userToDelete.email,
          name: `${userToDelete.firstname} ${userToDelete.lastname}`
        }
      });
    } else {
      console.log(`Waiter deleted but no corresponding user found with phone: ${waiterToDelete.phoneNumber}`);
      
      res.json({ 
        message: 'Waiter deleted successfully (no corresponding user account found)',
        deletedWaiter: {
          waiterId: deletedWaiter._id,
          name: deletedWaiter.name,
          phoneNumber: deletedWaiter.phoneNumber
        }
      });
    }

  } catch (err) {
    console.error('Error deleting waiter and user:', err);
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