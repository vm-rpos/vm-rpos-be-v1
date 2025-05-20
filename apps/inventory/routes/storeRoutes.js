const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const protect = require('../../pos/middlewares/authMiddleware');

router.use(protect);

// Route to get total store value
router.get('/total-store-value', storeController.getTotalStoreValue);

// Route to get order values
router.get('/order-values', storeController.getOrderValues);

module.exports = router;
