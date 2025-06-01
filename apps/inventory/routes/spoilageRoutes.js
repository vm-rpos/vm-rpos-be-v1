const express = require("express");
const router = express.Router();
const spoilageController = require("../controllers/spoilageController");
const protect = require("../../pos/middlewares/authMiddleware");

router.use(protect);

// Get all spoilage records with optional filters
// GET /api/inventory/spoilage?status=Pending&startDate=2024-01-01&endDate=2024-12-31&itemId=123&categoryId=456
router.get("/", spoilageController.getAllSpoilageRecords);

// Create new spoilage record
// POST /api/inventory/spoilage
router.post("/", spoilageController.createSpoilageRecord);


// Get specific spoilage record by ID
// GET /api/inventory/spoilage/:id
router.get("/:id", spoilageController.getSpoilageRecordById);



// Delete spoilage record (only for pending records)
// DELETE /api/inventory/spoilage/:id
router.delete("/:id", spoilageController.deleteSpoilageRecord);

module.exports = router;
