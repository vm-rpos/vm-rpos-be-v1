const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const Super = require("../models/Super");
const mongoose = require('mongoose');

exports.getAllRestaurants = async (req, res) => {
  try {
    const { userId } = req.query;

    let restaurants;

    if (userId) {
      // Find the Super document for the user
      const superUser = await Super.findOne({ user: userId }).populate({
        path: "createdRestaurants",
        populate: { path: "categories" }
      });

      if (!superUser) {
        return res.status(404).json({ error: "Super not found for this user" });
      }

      restaurants = superUser.createdRestaurants;
    } else {
      // No userId, return all restaurants
      restaurants = await Restaurant.find().populate("categories");
    }

    res.json(restaurants);
  } catch (err) {
    console.error("Error in getAllRestaurants:", err);
    res.status(500).json({ error: "Server error while fetching restaurants" });
  }
};



// Get a single restaurant by ID
exports.getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate("categories");
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// controllers/restaurantController.js
exports.createRestaurant = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.userId || req.body.userId;
    
    // Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    // Create restaurant
    const newRestaurant = new Restaurant({
      ...req.body,
      qrImage: req.body.qrImage || "",
      createdBy: userId
    });

    await newRestaurant.save({ session });

    // Update User
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { restaurantIds: newRestaurant._id } },
      { new: true, session }
    );

    // Update Super - just push the restaurant ID
    await Super.findOneAndUpdate(
      { user: userId },
      { 
        $addToSet: { createdRestaurants: newRestaurant._id },
        $setOnInsert: { user: userId }
      },
      { upsert: true, new: true, session }
    );

    await session.commitTransaction();
    
    const populatedRestaurant = await Restaurant.findById(newRestaurant._id)
      .populate('createdBy', 'firstname lastname email');
      
    res.status(201).json({
      success: true,
      data: populatedRestaurant
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Restaurant creation error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message,
      message: "Failed to create restaurant" 
    });
  } finally {
    session.endSession();
  }
};

exports.uploadQrImage = async (req, res) => {
  const restaurantId = req.params.id;

  if (!req.file) {
    return res.status(400).json({ message: "No image file uploaded" });
  }

  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  try {
    // Update the restaurant's qrImage field with the uploaded image URL
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { qrImage: imageUrl },
      { new: true }
    );

    if (!updatedRestaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.status(200).json({
      message: "QR Image uploaded and restaurant updated successfully",
      restaurant: updatedRestaurant,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Update a restaurant
exports.updateRestaurant = async (req, res) => {
  try {
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedRestaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json(updatedRestaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a restaurant
exports.deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json({ message: "Restaurant deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Get restaurant name during login
exports.getRestaurantName =  async(req,res)=>{
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json({ name: restaurant.name, qrImage: restaurant.qrImage });
  } catch (error) {
    res.status(500).json({ message: "Error fetching restaurant data" });
  }
}


