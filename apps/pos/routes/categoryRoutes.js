const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const protect = require('../middlewares/authMiddleware')

// Category routes
router.get('/', categoryController.getAllCategories);
router.post('/', protect, categoryController.createCategory);
router.get('/:id', categoryController.getCategoryById);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

// Item routes within a category
router.post('/:id/items', protect, categoryController.addItemToCategory);
router.put('/:categoryId/items/:itemId', categoryController.updateItemInCategory);
router.delete('/:categoryId/items/:itemId', categoryController.deleteItemFromCategory);

module.exports = router;
