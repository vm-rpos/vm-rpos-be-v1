const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const Super = require("../models/Super");
const mongoose = require("mongoose");

exports.getAllRestaurants = async (req, res) => {
  try {
    const { userId } = req.query;

    let restaurants;

    if (userId) {
      // Find the Super document for the user
      const superUser = await Super.findOne({ user: userId }).populate({
        path: "createdRestaurants",
        populate: [
          { path: "categories" },
          {
            path: "createdBy",
            select: "firstname lastname",
            model: User,
          },
        ],
      });

      // If no superUser found, return empty array instead of error
      restaurants = superUser?.createdRestaurants || [];
    } else {
      // No userId, return all restaurants
      restaurants = await Restaurant.find().populate("categories").populate({
        path: "createdBy",
        select: "firstname lastname",
        model: User,
      });
    }

    // Transform data for optimized response
    const response = await Promise.all(
      restaurants.map(async (restaurant) => {
        // Handle cases where createdBy might not be populated
        let creatorName = "System";
        if (restaurant.createdBy) {
          restaurant.userid = restaurant.createdBy._id;
          if (typeof restaurant.createdBy === "object") {
            // If populated, use firstname + lastname
            creatorName = `${restaurant.createdBy.firstname || ""} ${
              restaurant.createdBy.lastname || ""
            }`.trim();
          } else if (mongoose.Types.ObjectId.isValid(restaurant.createdBy)) {
            // If it's just an ObjectId, fetch the user
            const user = await User.findById(restaurant.createdBy)
              .select("firstname lastname")
              .lean();
            creatorName = user
              ? `${user.firstname || ""} ${user.lastname || ""}`.trim()
              : "Unknown User";
          }
        }

        return {
          id: restaurant._id,
          name: restaurant.name,
          shortName: restaurant.shortName || "restaurant",
          location: {
            address: restaurant.location?.address,
            city: restaurant.location?.city,
            zip: restaurant.location?.zip,
            state: restaurant.location?.state,
            
          },
          contact: {
            phone: restaurant.contact?.phone,
            email: restaurant.contact?.email,
            primaryContact:
              restaurant.contact?.phone || restaurant.contact?.email || "N/A",
          },
          createdById: restaurant.userid,
          createdBy: restaurant.createdBy,
          createdAt: restaurant.createdAt,
          dailyOrders: restaurant.billTracking?.dailyOrderCounter || 0,
          qrImage: restaurant.qrImage || "",
          lastReset: restaurant.billTracking?.lastResetDate,
          categories: restaurant.categories || [],
        };
      })
    );

    res.json(response);
  } catch (err) {
    console.error("Error in getAllRestaurants:", err);
    res.status(500).json({
      error: "Server error while fetching restaurants",
      details: err.message,
    });
  }
};

// Get a single restaurant by ID
exports.getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate(
      "categories"
    );
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
      throw new Error("Invalid user ID");
    }

    // Create restaurant
    const newRestaurant = new Restaurant({
      ...req.body,
      qrImage: req.body.qrImage || "",
      createdBy: userId,
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
        $setOnInsert: { user: userId },
      },
      { upsert: true, new: true, session }
    );

    await session.commitTransaction();

    const populatedRestaurant = await Restaurant.findById(
      newRestaurant._id
    ).populate("createdBy", "firstname lastname email");

    res.status(201).json({
      success: true,
      data: populatedRestaurant,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Restaurant creation error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Failed to create restaurant",
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

  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
    req.file.filename
  }`;

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
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Only update non-empty fields
    const updateFields = req.body;

    for (const key in updateFields) {
      const value = updateFields[key];

      // Handle nested objects like location and contact
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        for (const nestedKey in value) {
          if (value[nestedKey] !== undefined && value[nestedKey] !== '') {
            restaurant[key][nestedKey] = value[nestedKey];
          }
        }
      } else {
        // For top-level fields
        if (value !== undefined && value !== '') {
          restaurant[key] = value;
        }
      }
    }

    await restaurant.save();

    res.json(restaurant);
  } catch (err) {
    console.error("Error in updateRestaurant:", err);
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
exports.getRestaurantName = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json({ name: restaurant.name, qrImage: restaurant.qrImage });
  } catch (error) {
    res.status(500).json({ message: "Error fetching restaurant data" });
  }
};
