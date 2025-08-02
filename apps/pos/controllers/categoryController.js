const Category = require("../models/Category");
const Item = require("../models/Item");
const Tag = require("../models/Tag");
const mongoose = require("mongoose");
const Section=require('../models/Section')


exports.createMultipleCategoriesWithItems = async (req, res) => {
  try {
    // Extract payload
    const { restaurantId, categories } = req.body;

    // Validate restaurantId
    if (!restaurantId) {
      return res.status(400).json({ message: "restaurantId is required in payload" });
    }

    // Validate categories array
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ message: "Categories data is required and must be an array" });
    }

    // Fetch sections for this restaurant
    const allSections = await Section.find({ restaurantId });
    if (!allSections.length) {
      return res.status(400).json({ message: "No sections found for this restaurant" });
    }

    const results = [];

    for (const categoryData of categories) {
      const { name: categoryName, items } = categoryData;

      if (!categoryName) continue;

      // Check or create category
      let category = await Category.findOne({ name: categoryName, restaurantId });
      if (!category) {
        const last = await Category.findOne({ restaurantId }).sort({ index: -1 });
        const index = last?.index >= 0 ? last.index + 1 : 0;
        category = new Category({ name: categoryName, restaurantId, index });
        await category.save();
      }

      const createdItems = [];

      if (Array.isArray(items)) {
        for (const item of items) {
          const { name: itemName, description = "", price, sectionId } = item;

          if (!itemName || price == null) continue;

          // Avoid duplicate item in the same category
          const existingItem = await Item.findOne({ name: itemName, categoryId: category._id, restaurantId });
          if (existingItem) continue;

          let sectionData = [];

          if (sectionId) {
            const section = allSections.find(sec => sec._id.toString() === sectionId);
            if (!section) continue;

            sectionData.push({
              id: section._id,
              name: section.section,
              isAvailable: true,
              price
            });
          } else {
            // Apply price to all sections
            sectionData = allSections.map(section => ({
              id: section._id,
              name: section.section,
              isAvailable: true,
              price
            }));
          }

          const newItem = new Item({
            name: itemName,
            description,
            categoryId: category._id,
            categoryName: category.name,
            restaurantId,
            sectionData,
          });

          await newItem.save();
          createdItems.push(newItem);
        }
      }

      results.push({
        category: { _id: category._id, name: category.name },
        items: createdItems,
      });
    }

    res.status(201).json({ message: "Categories and items created successfully", data: results });

  } catch (error) {
    console.error("Error in createMultipleCategoriesWithItems:", error);
    res.status(500).json({ message: "Server error" });
  }
};




exports.reorderCategories = async (req, res) => {
  try {
    const { categoryIds } = req.body; // Array of category IDs in new order
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({ message: "Restaurant ID not found in token" });
    }

    if (!categoryIds || !Array.isArray(categoryIds)) {
      return res.status(400).json({ message: "categoryIds array is required" });
    }

    // Validate restaurantId
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurant ID format" });
    }

    const objectId = new mongoose.Types.ObjectId(restaurantId);

    // Verify all categories belong to this restaurant
    const categories = await Category.find({ 
      _id: { $in: categoryIds }, 
      restaurantId: objectId 
    });

    if (categories.length !== categoryIds.length) {
      return res.status(400).json({ message: "Some categories don't belong to this restaurant" });
    }

    // Update the index for each category based on its position in the array
    const updatePromises = categoryIds.map((categoryId, index) => {
      return Category.findByIdAndUpdate(
        categoryId,
        { index: index },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    res.json({ message: "Categories reordered successfully" });
  } catch (err) {
    console.error('Error reordering categories:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Updated getAllCategories method to sort by index
exports.getAllCategories = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;

    if (!restaurantId) {
      return res.status(400).json({ message: "Restaurant ID not found in token" });
    }

    // Validate restaurantId
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurant ID format" });
    }

    const objectId = new mongoose.Types.ObjectId(restaurantId);

    // Sort by index first, then by creation time for categories without index
    const categories = await Category.find({ restaurantId: objectId })
      .sort({ index: 1, createdAt: 1 });

    const categoriesWithItems = await Promise.all(
      categories.map(async (category) => {
        const items = await Item.find({
          categoryId: category._id,
          restaurantId: objectId,
        }).populate('tags');

        return {
          _id: category._id,
          name: category.name,
          index: category.index,
          items,
        };
      })
    );

    res.json(categoriesWithItems);
  } catch (err) {
    console.error('Error getting categories:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Updated createCategory method to set new categories at the end
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
      restaurantId: req.user.restaurantId,
    });

    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }

    // Get the highest index for this restaurant and add 1
    const lastCategory = await Category.findOne({ 
      restaurantId: req.user.restaurantId 
    }).sort({ index: -1 });

    const nextIndex = lastCategory && lastCategory.index >= 0 ? lastCategory.index + 1 : 0;

    const newCategory = new Category({
      name,
      restaurantId: req.user.restaurantId,
      index: nextIndex, // Set the new category at the end
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
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    const items = await Item.find({ categoryId: category._id }).populate(
      "tags"
    );
    res.json({ _id: category._id, name: category.name, items });
  } catch (err) {
    console.error("Error getting category:", err);
    res.status(500).json({ message: "Server error" });
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
    const userRestaurantId = req.user?.restaurantId;

    if (!userRestaurantId) {
      return res
        .status(403)
        .json({ message: "Unauthorized: No restaurant linked to user" });
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if category belongs to the user's restaurant
    if (category.restaurantId.toString() !== userRestaurantId.toString()) {
      return res
        .status(403)
        .json({
          message:
            "Unauthorized: Cannot delete category from another restaurant",
        });
    }

    // Delete the category and related items
    await Category.findByIdAndDelete(req.params.id);
    await Item.deleteMany({ categoryId: req.params.id });

    res.json({ message: "Category and all its items deleted successfully" });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Add item to category with tag and sectionData handling
exports.addItemToCategory = async (req, res) => {
  try {
    const { name, description, tags, sectionData } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Item name is required" });
    }

    if (!req.user || !req.user.restaurantId) {
      return res
        .status(403)
        .json({ message: "Unauthorized: No restaurant assigned" });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (category.restaurantId.toString() !== req.user.restaurantId) {
      return res
        .status(403)
        .json({
          message: "Unauthorized: Category does not belong to your restaurant",
        });
    }

    const existingItem = await Item.findOne({
      categoryId: category._id,
      name,
      restaurantId: req.user.restaurantId,
    });

    if (existingItem) {
      return res
        .status(400)
        .json({
          message: "Item with this name already exists in the category",
        });
    }

    // Process tags
    let tagIds = [];
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        let tag = await Tag.findOne({
          name: { $regex: new RegExp(`^${tagName}$`, "i") },
        });
        if (!tag) {
          tag = new Tag({ name: tagName });
          await tag.save();
        }
        tagIds.push(tag._id);
      }
    }

    // Handle sectionData if provided
    let itemSectionData = [];
    if (Array.isArray(sectionData) && sectionData.length > 0) {
      itemSectionData = sectionData; // Store provided sectionData
    }

    const newItem = new Item({
      name,
      description: description || "",
      tags: tagIds,
      categoryId: category._id,
      categoryName: category.name,
      restaurantId: req.user.restaurantId,
      sectionData: itemSectionData, // Store sectionData (empty if not provided)
    });

    await newItem.save();

    const items = await Item.find({ categoryId: category._id }).populate(
      "tags"
    );
    res.status(201).json({ _id: category._id, name: category.name, items });
  } catch (err) {
    console.error("Error adding item to category:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update item in category with tag and sectionData handling
exports.updateItemInCategory = async (req, res) => {
  try {
    const { name, description, tags, sectionData } = req.body;

    // Ensure name is provided
    if (!name) {
      return res.status(400).json({ message: "Item name is required" });
    }

    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const item = await Item.findOne({
      _id: req.params.itemId,
      categoryId: category._id,
    });
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Check for duplicate item name in the category
    const duplicateItem = await Item.findOne({
      categoryId: category._id,
      name,
      _id: { $ne: req.params.itemId },
    });
    if (duplicateItem) {
      return res
        .status(400)
        .json({
          message: "Another item with this name already exists in the category",
        });
    }

    // Process tags if provided
    let tagIds = item.tags; // Default to current tags
    if (tags !== undefined) {
      tagIds = []; // Reset tags array

      // Process each tag name
      for (const tagName of tags) {
        let tag = await Tag.findOne({
          name: { $regex: new RegExp(`^${tagName}$`, "i") },
        });
        if (!tag) {
          tag = new Tag({ name: tagName });
          await tag.save();
        }
        tagIds.push(tag._id);
      }
    }

    // Prepare update fields
    const updatedFields = {
      name, // Updated name
      description: description !== undefined ? description : item.description, // If description is provided, update, else keep the existing one
      tags: tagIds, // Updated tags
      categoryName: category.name, // Keeping the category name as it is
    };

    // Handle sectionData update if provided
    if (Array.isArray(sectionData)) {
      updatedFields.sectionData = sectionData; // Update section data if provided
    }

    // Update the item in the database
    await Item.findByIdAndUpdate(req.params.itemId, updatedFields);

    // Fetch updated list of items in the category
    const updatedItems = await Item.find({ categoryId: category._id }).populate(
      "tags"
    );
    res.json({ _id: category._id, name: category.name, items: updatedItems });
  } catch (err) {
    console.error("Error updating item in category:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete an item from a category
exports.deleteItemFromCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    const item = await Item.findOne({
      _id: req.params.itemId,
      categoryId: category._id,
    });
    if (!item) return res.status(404).json({ message: "Item not found" });

    await Item.findByIdAndDelete(req.params.itemId);

    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error("Error deleting item from category:", err);
    res.status(500).json({ message: "Server error" });
  }
};


