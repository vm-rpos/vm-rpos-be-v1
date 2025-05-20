const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const protect = require('../../pos/middlewares/authMiddleware');

router.use(protect);

router.get('/', itemController.getAllItems);
router.get('/:id', itemController.getItemById);
// Add other routes as needed

module.exports = router;