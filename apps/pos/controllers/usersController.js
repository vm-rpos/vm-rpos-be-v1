
const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
// Get all users by restaurant ID
exports.getUsersByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Validate restaurantId
    if (!restaurantId) {
      return res.status(400).json({ message: "Restaurant ID is required" });
    }

    // Check if the restaurant exists
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Find all users associated with this restaurant
    const users = await User.find({ restaurantId });

    // Map users to only include the required fields
    const filteredUsers = users.map((user) => {
      return {
        id:user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        phonenumber: user.phonenumber,
        email: user.email
      };
    });

    res.json({
      success: true,
      count: filteredUsers.length,
      users: filteredUsers,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
