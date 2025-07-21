const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const protect = require('../middlewares/authMiddleware')

router.use(protect); // Protect all routes in this file

// Category routes
router.post('/all',categoryController.createMultipleCategoriesWithItems);
router.get('/', categoryController.getAllCategories);
router.post('/', categoryController.createCategory);

// IMPORTANT: Move reorder route BEFORE /:id routes
router.put('/reorder', categoryController.reorderCategories);

router.get('/:id', categoryController.getCategoryById);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

// Item routes within a category
router.post('/:id/items', categoryController.addItemToCategory);
router.put('/:categoryId/items/:itemId', categoryController.updateItemInCategory);
router.delete('/:categoryId/items/:itemId', categoryController.deleteItemFromCategory);

module.exports = router;