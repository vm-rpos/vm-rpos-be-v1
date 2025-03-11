const Category = require('../models/Category');
const Item = require('../models/Item');

// Get all categories with their items
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    const categoriesWithItems = await Promise.all(
      categories.map(async (category) => {
        const items = await Item.find({ categoryId: category._id });
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
    if (!name) return res.status(400).json({ message: 'Category name is required' });

    const existingCategory = await Category.findOne({ name });
    if (existingCategory) return res.status(400).json({ message: 'Category already exists' });

    const newCategory = new Category({ name });
    const savedCategory = await newCategory.save();

    res.status(201).json({ _id: savedCategory._id, name: savedCategory.name, items: [] });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a specific category with its items
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const items = await Item.find({ categoryId: category._id });
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

    const items = await Item.find({ categoryId: updatedCategory._id });
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

// Add an item to a category
exports.addItemToCategory = async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!name || price === undefined) return res.status(400).json({ message: 'Item name and price are required' });

    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const existingItem = await Item.findOne({ categoryId: category._id, name });
    if (existingItem) return res.status(400).json({ message: 'Item with this name already exists in the category' });

    const newItem = new Item({ name, price, categoryId: category._id, categoryName: category.name });
    await newItem.save();

    const items = await Item.find({ categoryId: category._id });
    res.status(201).json({ _id: category._id, name: category.name, items });
  } catch (err) {
    console.error('Error adding item to category:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update an item in a category
exports.updateItemInCategory = async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!name || price === undefined) return res.status(400).json({ message: 'Item name and price are required' });

    const category = await Category.findById(req.params.categoryId);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const item = await Item.findOne({ _id: req.params.itemId, categoryId: category._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const duplicateItem = await Item.findOne({ categoryId: category._id, name, _id: { $ne: req.params.itemId } });
    if (duplicateItem) return res.status(400).json({ message: 'Another item with this name already exists in the category' });

    await Item.findByIdAndUpdate(req.params.itemId, { name, price, categoryName: category.name });

    const updatedItems = await Item.find({ categoryId: category._id });
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
