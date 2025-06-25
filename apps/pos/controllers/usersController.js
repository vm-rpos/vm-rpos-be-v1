const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Waiter = require("../models/Waiter");

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

    const filteredUsers = users.map((user) => ({
      id: user._id,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
      phonenumber: user.phonenumber,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
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
        isActive: user.isActive,
      },
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
    const { firstname, lastname, phonenumber, email, password, pin, role } =
      req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // If email is being changed, require re-verification
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: userId } });
      if (emailExists) {
        return res
          .status(400)
          .json({ error: "Email already in use by another user" });
      }

      // Mark email as unverified if changed
      user.isEmailVerified = false;
      user.isActive = false;
      // Note: You might want to implement a separate email change verification flow
    }

    // If phone number is being changed and user is a waiter, check for duplicates
    if (
      phonenumber &&
      phonenumber !== user.phonenumber &&
      user.role === "waiter"
    ) {
      const existingWaiter = await Waiter.findOne({
        phoneNumber: phonenumber,
        userId: { $ne: userId }, // Exclude current user's waiter record
      });
      if (existingWaiter) {
        return res
          .status(400)
          .json({ error: "Phone number already exists in waiter records" });
      }
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
    if (
      role &&
      !["admin", "pos", "ivm", "superadmin", "salesadmin", "waiter"].includes(
        role
      )
    ) {
      return res
        .status(400)
        .json({ error: "Role must be either 'admin', 'pos', 'ivm', 'waiter'" });
    }

    // Update password if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    // Store original values for waiter update comparison
    const originalRole = user.role;
    const originalPhone = user.phonenumber;

    // Update user fields
    if (firstname) user.firstname = firstname;
    if (lastname) user.lastname = lastname;
    if (phonenumber) user.phonenumber = phonenumber;
    if (email) user.email = email;
    if (role) user.role = role;

    await user.save();

    // Handle waiter record updates
    let waiterUpdateResult = null;

    // If user was a waiter before the update
    if (originalRole === "waiter") {
      // Find the existing waiter record
      let existingWaiter = await Waiter.findOne({ userId: userId });

      // If no userId link, try to find by phone number
      if (!existingWaiter) {
        existingWaiter = await Waiter.findOne({
          phoneNumber: originalPhone,
        });
      }

      if (existingWaiter) {
        if (user.role === "waiter") {
          // Still a waiter - update the waiter record
          const waiterUpdateData = {};

          if (firstname || lastname) {
            waiterUpdateData.name = `${user.firstname} ${user.lastname}`.trim();
          }
          if (phonenumber) {
            waiterUpdateData.phoneNumber = user.phonenumber;
          }

          if (Object.keys(waiterUpdateData).length > 0) {
            const updatedWaiter = await Waiter.findByIdAndUpdate(
              existingWaiter._id,
              waiterUpdateData,
              { new: true }
            );
            waiterUpdateResult = { action: "updated", waiter: updatedWaiter };
            console.log(`Updated waiter record for user: ${user.email}`);
          }
        } else {
          // Role changed from waiter to something else - delete waiter record
          await Waiter.findByIdAndDelete(existingWaiter._id);
          waiterUpdateResult = {
            action: "deleted",
            waiterId: existingWaiter._id,
          };
          console.log(
            `Deleted waiter record for user (role changed): ${user.email}`
          );
        }
      }
    } else if (user.role === "waiter" && originalRole !== "waiter") {
      // Role changed to waiter - create new waiter record
      try {
        const newWaiter = new Waiter({
          name: `${user.firstname} ${user.lastname}`.trim(),
          age: 20, // Default age
          phoneNumber: user.phonenumber,
          restaurantId: user.restaurantId,
          userId: user._id,
        });

        await newWaiter.save();
        waiterUpdateResult = { action: "created", waiter: newWaiter };
        console.log(
          `Created waiter record for user (role changed): ${user.email}`
        );
      } catch (waiterError) {
        console.error("Failed to create waiter record:", waiterError);
        // Note: You might want to revert user changes here if waiter creation fails
        return res.status(500).json({
          error:
            "User updated but failed to create waiter record. Please contact support.",
        });
      }
    }

    // Prepare response
    const response = {
      message:
        email && email !== user.email
          ? "User updated successfully. Email verification required for new email."
          : "User updated successfully",
      user: {
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phonenumber: user.phonenumber,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
      },
    };

    // Add waiter information to response if applicable
    if (waiterUpdateResult) {
      response.waiterUpdate = waiterUpdateResult;

      // Update message based on waiter action
      if (waiterUpdateResult.action === "created") {
        response.message += " Waiter profile created.";
      } else if (waiterUpdateResult.action === "updated") {
        response.message += " Waiter profile updated.";
      } else if (waiterUpdateResult.action === "deleted") {
        response.message += " Waiter profile removed.";
      }
    }

    res.json(response);
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
        email: deletedUser.email,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
