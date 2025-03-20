const express = require('express');
const router = express.Router();
const waiterController = require('../controllers/waiterController');
const protect = require('../middlewares/authMiddleware')

router.get('/', waiterController.getAllWaiters);
router.post('/', protect, waiterController.createWaiter);
router.get('/:id', waiterController.getWaiterById);
router.put('/:id', waiterController.updateWaiter);
router.delete('/:id', waiterController.deleteWaiter);

module.exports = router;
