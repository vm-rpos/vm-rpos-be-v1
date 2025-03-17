const IvmTag = require('../models/Tag');

// Get all ivmTags
exports.getAllIvmTags = async (req, res) => {
  try {
    const tags = await IvmTag.find().sort({ name: 1 });
    res.json(tags);
  } catch (err) {
    console.error('Error getting ivmTags:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new ivmTag
exports.createIvmTag = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Tag name is required' });

    let tag = await IvmTag.findOne({ name: name.toLowerCase().trim() });

    if (!tag) {
      tag = new IvmTag({ name: name.toLowerCase().trim() });
      await tag.save();
    }

    res.status(201).json(tag);
  } catch (err) {
    console.error('Error creating ivmTag:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update an ivmTag
exports.updateIvmTag = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Tag name is required" });

    const updatedTag = await IvmTag.findByIdAndUpdate(
      req.params.id,
      { name: name.toLowerCase().trim() },
      { new: true }
    );

    if (!updatedTag) return res.status(404).json({ message: "Tag not found" });

    res.json(updatedTag);
  } catch (err) {
    console.error("Error updating ivmTag:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete an ivmTag
exports.deleteIvmTag = async (req, res) => {
  try {
    const deletedTag = await IvmTag.findByIdAndDelete(req.params.id);
    if (!deletedTag) return res.status(404).json({ message: 'Tag not found' });

    res.json({ message: 'Tag deleted successfully' });
  } catch (err) {
    console.error('Error deleting ivmTag:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Function to ensure ivmTags exist (used by other controllers)
exports.ensureIvmTagsExist = async (tagNames) => {
  const tagIds = [];

  for (const name of tagNames) {
    if (!name.trim()) continue;

    let tag = await IvmTag.findOne({ name: name.toLowerCase().trim() });

    if (!tag) {
      tag = new IvmTag({ name: name.toLowerCase().trim() });
      await tag.save();
    }

    tagIds.push(tag._id);
  }

  return tagIds;
};
