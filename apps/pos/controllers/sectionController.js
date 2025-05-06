const mongoose = require('mongoose');
const Section = require('../models/Section');

// Get all sections for the user's restaurant
exports.getAllSections = async (req, res) => {
  try {
    if (!req.user || !req.user.restaurantId) {
      return res.status(403).json({ message: "Unauthorized: No restaurant assigned" });
    }

    const restaurantId = req.user.restaurantId;

    const sections = await Section.find({ restaurantId }).sort({ createdAt: -1 });
    res.json(sections);
  } catch (err) {
    console.error("Error fetching sections:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Create a new section
exports.createSection = async (req, res) => {
  try {
    const { section } = req.body;

    if (!section) {
      return res.status(400).json({ message: "Section name is required" });
    }

    if (!req.user || !req.user.restaurantId) {
      return res.status(403).json({ message: "Unauthorized: No restaurant assigned" });
    }

    const newSection = new Section({
      section,
      restaurantId: req.user.restaurantId
    });

    await newSection.save();
    res.status(201).json(newSection);
  } catch (err) {
    console.error("Error creating section:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a single section by ID
exports.getSectionById = async (req, res) => {
  try {
    const section = await Section.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId
    });

    if (!section) return res.status(404).json({ message: "Section not found" });

    res.json(section);
  } catch (err) {
    console.error("Error fetching section:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update a section
exports.updateSection = async (req, res) => {
  try {
    const { section } = req.body;

    const updateData = {};
    if (section) updateData.section = section;

    const updatedSection = await Section.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.user.restaurantId },
      updateData,
      { new: true }
    );

    if (!updatedSection) return res.status(404).json({ message: "Section not found" });

    res.json(updatedSection);
  } catch (err) {
    console.error("Error updating section:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a section
exports.deleteSection = async (req, res) => {
  try {
    const deletedSection = await Section.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.user.restaurantId
    });

    if (!deletedSection) return res.status(404).json({ message: "Section not found" });

    res.json({ message: "Section deleted successfully" });
  } catch (err) {
    console.error("Error deleting section:", err);
    res.status(500).json({ message: "Server error" });
  }
};
