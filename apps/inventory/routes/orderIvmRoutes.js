const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Get all orders
router.get('/', orderController.getAllOrders);

// Create new order
router.post('/', orderController.createOrder);

// Get orders by type
router.get('/type/:type', orderController.getOrdersByType);

// Get specific order
router.get('/:id', orderController.getOrderById);

// Update order
router.put('/:id', orderController.updateOrder);

// Update order status
router.put('/:id/status', orderController.updateOrderStatus);

// Delete order
router.delete('/:id', orderController.deleteOrder);

module.exports = router;