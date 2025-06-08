const express = require("express");
const {
  createGroup,
  getGroupsBySection,
  addWaiterToGroup,
  manageTables,
  getAllSectionsWithGroups, // Import the new controller
} = require("../controllers/groupController");
const protect = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all routes
router.use(protect);

// Route to create a new group
router.post("/", createGroup);

// Route to add a waiter to a group
router.put("/:groupId/waiter", addWaiterToGroup);

// Route to manage tables in a group
router.put("/:groupId/tables", manageTables);

// Route to get groups by section
router.get("/:sectionId/groups", getGroupsBySection);

// ✅ New Route: Get all sections with groups, tables, and waiters
router.get("/all/sections", getAllSectionsWithGroups);

module.exports = router;
