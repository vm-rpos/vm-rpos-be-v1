// routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Analytics routes
router.get('/', analyticsController.getAnalyticsData);

// router.get("/table-performance", analyticsController.getTablePerformance);

module.exports = router;