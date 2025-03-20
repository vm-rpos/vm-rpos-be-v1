const Category = require('../models/Category');
const Item = require('../models/Item');
const Tag = require('../models/Tag');

// Get all categories with their items
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    const categoriesWithItems = await Promise.all(
      categories.map(async (category) => {
        const items = await Item.find({ categoryId: category._id }).populate('tags');
        return { _id: category._id, name: category.name, items };
      })
    );
    res.json(categoriesWithItems);
  } catch (err) {
    console.error('Error getting categories:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Ensure the request is authenticated and contains restaurantId
    if (!req.user || !req.user.restaurantId) {
      return res.status(403).json({ message: "Unauthorized: No restaurant assigned" });
    }

    const existingCategory = await Category.findOne({
      name,
      restaurantId: req.user.restaurantId, // Ensure uniqueness within a restaurant
    });

    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const newCategory = new Category({
      name,
      restaurantId: req.user.restaurantId, // Assign restaurantId
    });

    const savedCategory = await newCategory.save();
    res.status(201).json(savedCategory);
  } catch (err) {
    console.error("Error creating category:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a specific category with its items
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const items = await Item.find({ categoryId: category._id }).populate('tags');
    res.json({ _id: category._id, name: category.name, items });
  } catch (err) {
    console.error('Error getting category:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a category name
exports.updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );

    if (!updatedCategory) return res.status(404).json({ message: 'Category not found' });

    await Item.updateMany({ categoryId: updatedCategory._id }, { categoryName: name });

    const items = await Item.find({ categoryId: updatedCategory._id }).populate('tags');
    res.json({ _id: updatedCategory._id, name: updatedCategory.name, items });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a category and all its items
exports.deleteCategory = async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);
    if (!deletedCategory) return res.status(404).json({ message: 'Category not found' });

    await Item.deleteMany({ categoryId: req.params.id });

    res.json({ message: 'Category and all its items deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add item to category with tag handling
exports.addItemToCategory = async (req, res) => {
  try {
    const { name, price, description, tags } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ message: "Item name and price are required" });
    }

    // Ensure the request is authenticated and contains restaurantId
    if (!req.user || !req.user.restaurantId) {
      return res.status(403).json({ message: "Unauthorized: No restaurant assigned" });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Ensure the category belongs to the same restaurant
    if (category.restaurantId.toString() !== req.user.restaurantId) {
      return res.status(403).json({ message: "Unauthorized: Category does not belong to your restaurant" });
    }

    const existingItem = await Item.findOne({
      categoryId: category._id,
      name,
      restaurantId: req.user.restaurantId, // Ensure uniqueness within a restaurant
    });

    if (existingItem) {
      return res.status(400).json({ message: "Item with this name already exists in the category" });
    }

    // Handle tags
    let tagIds = [];
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        let tag = await Tag.findOne({ name: { $regex: new RegExp(`^${tagName}$`, "i") } });

        if (!tag) {
          tag = new Tag({ name: tagName });
          await tag.save();
        }

        tagIds.push(tag._id);
      }
    }

    const newItem = new Item({
      name,
      price,
      description: description || "",
      tags: tagIds,
      categoryId: category._id,
      categoryName: category.name,
      restaurantId: req.user.restaurantId, // Assign restaurantId
    });

    await newItem.save();

    const items = await Item.find({ categoryId: category._id }).populate("tags");
    res.status(201).json({ _id: category._id, name: category.name, items });
  } catch (err) {
    console.error("Error adding item to category:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update item in category with tag handling
exports.updateItemInCategory = async (req, res) => {
  try {
    const { name, price, description, tags } = req.body;
    if (!name || price === undefined) return res.status(400).json({ message: 'Item name and price are required' });

    const category = await Category.findById(req.params.categoryId);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const item = await Item.findOne({ _id: req.params.itemId, categoryId: category._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const duplicateItem = await Item.findOne({ categoryId: category._id, name, _id: { $ne: req.params.itemId } });
    if (duplicateItem) return res.status(400).json({ message: 'Another item with this name already exists in the category' });

    // Handle tags
    let tagIds = item.tags; // Default to current tags
    
    if (tags !== undefined) {
      tagIds = [];
      // Process each tag name
      for (const tagName of tags) {
        // Look for existing tag or create a new one
        let tag = await Tag.findOne({ name: { $regex: new RegExp(`^${tagName}$`, 'i') } });
        
        if (!tag) {
          tag = new Tag({ name: tagName });
          await tag.save();
        }
        
        tagIds.push(tag._id);
      }
    }

    await Item.findByIdAndUpdate(req.params.itemId, { 
      name, 
      price, 
      description: description !== undefined ? description : item.description,
      tags: tagIds,
      categoryName: category.name 
    });

    const updatedItems = await Item.find({ categoryId: category._id }).populate('tags');
    res.json({ _id: category._id, name: category.name, items: updatedItems });
  } catch (err) {
    console.error('Error updating item in category:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete an item from a category
exports.deleteItemFromCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const item = await Item.findOne({ _id: req.params.itemId, categoryId: category._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    await Item.findByIdAndDelete(req.params.itemId);

    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Error deleting item from category:', err);
    res.status(500).json({ message: 'Server error' });
  }
};