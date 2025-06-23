const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authMiddleware");
const { getTablesBySectionId } = require("../controllers/mobileController");
// Apply auth middleware to all routes
router.use(protect);

router.get("/section/:sectionId/tables", getTablesBySectionId);

module.exports = router;
