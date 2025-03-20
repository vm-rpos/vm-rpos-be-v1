const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const protect = require('../middlewares/authMiddleware')

router.get('/', tableController.getAllTables);
router.post('/', protect, tableController.createTable);
router.get('/:id', tableController.getTableById);
router.put('/:id', tableController.updateTable);
router.delete('/:id', tableController.deleteTable);
router.post('/:id/orders',protect, tableController.placeOrder);
router.delete('/:id/orders', tableController.clearOrders);

module.exports = router;
