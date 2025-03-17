const express = require('express');
const router = express.Router();
const ivmOrderController = require('../controllers/ivmOrderController');

// Get all orders
router.get('/', ivmOrderController.getAllIVMOrders);

// Create a new order
router.post('/', ivmOrderController.createIVMOrder);

// Get a specific order by ID
router.get('/:id', ivmOrderController.getIVMOrderById);

// Update an order
router.put('/:id', ivmOrderController.updateIVMOrder);

// Update order status
router.put('/:id/status', ivmOrderController.updateOrderStatus);

// Delete an order
router.delete('/:id', ivmOrderController.deleteIVMOrder);

// Add this to your router
router.get('/type/:orderType', ivmOrderController.getOrdersByType);

module.exports = router;