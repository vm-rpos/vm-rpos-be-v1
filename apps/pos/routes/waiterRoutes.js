const express = require('express');
const router = express.Router();
const waiterController = require('../controllers/waiterController');

router.get('/', waiterController.getAllWaiters);
router.post('/', waiterController.createWaiter);
router.get('/:id', waiterController.getWaiterById);
router.put('/:id', waiterController.updateWaiter);
router.delete('/:id', waiterController.deleteWaiter);

module.exports = router;
