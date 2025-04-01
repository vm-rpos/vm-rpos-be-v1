const express = require('express');
const router = express.Router();
const ivmOrderController = require('../controllers/ivmOrderController');

// ✅ Define these first to avoid conflict
router.get('/count', ivmOrderController.getOrderCounts);
router.get('/type/:orderType', ivmOrderController.getOrdersByType);
router.get('/order-values', ivmOrderController.getOrderValues);
router.get('/purchase-stats', ivmOrderController.getPurchaseOrderStats);


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

module.exports = router;
