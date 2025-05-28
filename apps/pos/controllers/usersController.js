const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const mongoose = require("mongoose");

// Get all users by restaurant ID
exports.getUsersByRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const users = await User.find({ restaurantId: req.params.restaurantId });

    const filteredUsers = users.map(user => ({
      id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
      phonenumber: user.phonenumber,
      email: user.email
    }));

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

// Get single user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        phonenumber: user.phonenumber,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Edit user by ID
exports.editUserById = async (req, res) => {
  try {
    const { firstname, lastname, role, phonenumber, email } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { firstname, lastname, role, phonenumber, email },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      user: {
        id: updatedUser._id,
        firstname: updatedUser.firstname,
        lastname: updatedUser.lastname,
        role: updatedUser.role,
        phonenumber: updatedUser.phonenumber,
        email: updatedUser.email
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Delete user by ID
exports.deleteUserById = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
      user: {
        id: deletedUser._id,
        firstname: deletedUser.firstname,
        lastname: deletedUser.lastname,
        role: deletedUser.role,
        phonenumber: deletedUser.phonenumber,
        email: deletedUser.email
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};