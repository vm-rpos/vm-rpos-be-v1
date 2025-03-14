// controllers/itemController.js
const Item = require('../models/Item');
const Category = require('../models/Category');

// Controller methods for item operations
const itemController = {
  // Add an item to a category
  createItem: async (req, res) => {
    try {
      const { name, price, categoryId } = req.body;
      
      if (!name || price === undefined || !categoryId) {
        return res.status(400).json({ 
          message: 'Item name, price, and categoryId are required' 
        });
      }
      
      // Check if category exists
      const categoryExists = await Category.findById(categoryId);
      if (!categoryExists) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      // Check if item with same name already exists in this category
      const existingItem = await Item.findOne({ name, categoryId });
      if (existingItem) {
        return res.status(400).json({ 
          message: 'Item with this name already exists in the category' 
        });
      }
      
      const newItem = new Item({
        name,
        price,
        categoryId
      });
      
      const savedItem = await newItem.save();
      res.status(201).json(savedItem);
    } catch (err) {
      console.error('Error adding item:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get all items
  getAllItems: async (req, res) => {
    try {
      const items = await Item.find().populate('categoryId', 'name');
      res.json(items);
    } catch (err) {
      console.error('Error getting items:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get a specific item
  getItemById: async (req, res) => {
    try {
      const item = await Item.findById(req.params.id).populate('categoryId', 'name');
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }
      res.json(item);
    } catch (err) {
      console.error('Error getting item:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Update an item
  updateItem: async (req, res) => {
    try {
      const { name, price, categoryId } = req.body;
      
      if (!name || price === undefined || !categoryId) {
        return res.status(400).json({ 
          message: 'Item name, price, and categoryId are required' 
        });
      }
      
      // Check if category exists
      const categoryExists = await Category.findById(categoryId);
      if (!categoryExists) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      // Check if another item with the same name exists in this category
      const duplicateItem = await Item.findOne({ 
        name, 
        categoryId,
        _id: { $ne: req.params.id }
      });
      
      if (duplicateItem) {
        return res.status(400).json({ 
          message: 'Another item with this name already exists in the category' 
        });
      }
      
      const updatedItem = await Item.findByIdAndUpdate(
        req.params.id,
        { name, price, categoryId },
        { new: true }
      );
      
      if (!updatedItem) {
        return res.status(404).json({ message: 'Item not found' });
      }
      
      res.json(updatedItem);
    } catch (err) {
      console.error('Error updating item:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Delete an item
  deleteItem: async (req, res) => {
    try {
      const deletedItem = await Item.findByIdAndDelete(req.params.id);
      if (!deletedItem) {
        return res.status(404).json({ message: 'Item not found' });
      }
      res.json({ message: 'Item deleted successfully' });
    } catch (err) {
      console.error('Error deleting item:', err);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get items by category name
  getItemsByCategoryName: async (req, res) => {
    try {
      const category = await Category.findOne({ 
        name: req.params.categoryName 
      });
      
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      const items = await Item.find({ categoryId: category._id });
      res.json(items);
    } catch (err) {
      console.error('Error getting items by category name:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = itemController;