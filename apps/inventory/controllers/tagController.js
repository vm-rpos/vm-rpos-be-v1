// controllers/tagController.js
const Tag = require('../models/Tag');

// Get all tags
exports.getAllTags = async (req, res) => {
  try {
    const tags = await Tag.find().sort({ name: 1 });
    res.json(tags);
  } catch (err) {
    console.error('Error getting tags:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new tag
exports.createTag = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Tag name is required' });

    // Check if tag already exists
    let tag = await Tag.findOne({ name: name.toLowerCase().trim() });
    
    // If tag doesn't exist, create it
    if (!tag) {
      tag = new Tag({ name: name.toLowerCase().trim() });
      await tag.save();
    }
    
    res.status(201).json(tag);
  } catch (err) {
    console.error('Error creating tag:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a tag
exports.updateTag = async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: "Tag name is required" });
  
      const updatedTag = await Tag.findByIdAndUpdate(
        req.params.id,
        { name: name.toLowerCase().trim() },
        { new: true }
      );
  
      if (!updatedTag) return res.status(404).json({ message: "Tag not found" });
  
      res.json(updatedTag);
    } catch (err) {
      console.error("Error updating tag:", err);
      res.status(500).json({ message: "Server error" });
    }
  };
  
// Delete a tag
exports.deleteTag = async (req, res) => {
  try {
    const deletedTag = await Tag.findByIdAndDelete(req.params.id);
    if (!deletedTag) return res.status(404).json({ message: 'Tag not found' });

    // Note: In a production environment, you would also update all items that use this tag
    
    res.json({ message: 'Tag deleted successfully' });
  } catch (err) {
    console.error('Error deleting tag:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Function to ensure tags exist (used by other controllers)
exports.ensureTagsExist = async (tagNames) => {
  const tagIds = [];
  
  for (const name of tagNames) {
    if (!name.trim()) continue;
    
    // Check if tag exists
    let tag = await Tag.findOne({ name: name.toLowerCase().trim() });
    
    // If not, create it
    if (!tag) {
      tag = new Tag({ name: name.toLowerCase().trim() });
      await tag.save();
    }
    
    tagIds.push(tag._id);
  }
  
  return tagIds;
};