const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');

router.get('/', purchaseOrderController.getAllPurchaseOrders);
router.post('/', purchaseOrderController.createPurchaseOrder);
router.put('/:id', purchaseOrderController.updatePurchaseOrder);
router.put('/:id/status', purchaseOrderController.updateOrderStatus);
router.delete('/:id', purchaseOrderController.deletePurchaseOrder);

module.exports = router;