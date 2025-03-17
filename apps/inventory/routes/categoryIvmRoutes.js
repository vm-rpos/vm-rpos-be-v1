const express = require('express');
const router = express.Router();
const ivmCategoryController = require('../controllers/categoryController'); // Update controller file name

// IvmCategory routes
router.get('/', ivmCategoryController.getAllIvmCategories);
router.post('/', ivmCategoryController.createIvmCategory);
router.get('/:id', ivmCategoryController.getIvmCategoryById);
router.put('/:id', ivmCategoryController.updateIvmCategory);
router.delete('/:id', ivmCategoryController.deleteIvmCategory);

// Item routes within an ivmCategory
router.post('/:id/items', ivmCategoryController.addItemToIvmCategory);
router.put('/:categoryId/items/:itemId', ivmCategoryController.updateItemInIvmCategory);
router.delete('/:categoryId/items/:itemId', ivmCategoryController.deleteItemFromIvmCategory);

module.exports = router;
