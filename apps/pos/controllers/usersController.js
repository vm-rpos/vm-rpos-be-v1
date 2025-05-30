const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Get all users by restaurant ID (only active/verified users)
exports.getUsersByRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const users = await User.find({ 
      restaurantId: req.params.restaurantId,
     
    });

    const filteredUsers = users.map(user => ({
      id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
      phonenumber: user.phonenumber,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive
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
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Update user details (excluding restaurantId and tokens)
exports.editUserById = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const {
      firstname,
      lastname,
      phonenumber,
      email,
      password,
      pin,
      role
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

  

    // If email is being changed, require re-verification
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: userId } });
      if (emailExists) {
        return res.status(400).json({ error: "Email already in use by another user" });
      }
      
      // Mark email as unverified if changed
      user.isEmailVerified = false;
      user.isActive = false;
      // Note: You might want to implement a separate email change verification flow
    }

    // Validate and update PIN if provided
    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({ error: "PIN must be a 4-digit number" });
      }
      const hashedPin = await bcrypt.hash(pin, 10);
      user.pin = hashedPin;
    }

    // Validate and update role
    if (role && !["admin", "pos", "ivm","superadmin","salesadmin"].includes(role)) {
      return res.status(400).json({ error: "Role must be either 'admin', 'pos', 'ivm'" });
    }

    // Update password if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    // Update other fields
    if (firstname) user.firstname = firstname;
    if (lastname) user.lastname = lastname;
    if (phonenumber) user.phonenumber = phonenumber;
    if (email) user.email = email;
    if (role) user.role = role;

    await user.save();

    res.json({
      message: email && email !== user.email ? 
        "User updated successfully. Email verification required for new email." : 
        "User updated successfully",
      user: {
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phonenumber: user.phonenumber,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error("Update user error:", error.message);
    res.status(500).json({ error: error.message });
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