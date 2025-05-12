// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const protect = require('../middlewares/authMiddleware');

router.use(protect); // Protect all routes in this file

// Order routes
router.get('/', orderController.getAllOrders);

// Other order routes...

module.exports = router;