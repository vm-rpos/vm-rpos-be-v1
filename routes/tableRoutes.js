const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');

router.get('/', tableController.getAllTables);
router.post('/', tableController.createTable);
router.get('/:id', tableController.getTableById);
router.put('/:id', tableController.updateTable);
router.delete('/:id', tableController.deleteTable);
router.post('/:id/orders', tableController.placeOrder);
router.delete('/:id/orders', tableController.clearOrders);

module.exports = router;
