const Restaurant = require("../models/Restaurant");

// Get all restaurants
exports.getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate("categories");
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// Create a new restaurant
exports.createRestaurant = async (req, res) => {
  try {
    const newRestaurant = new Restaurant({...req.body, qrImage: req.body.qrImage || "",});
    await newRestaurant.save();
    res.status(201).json(newRestaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
