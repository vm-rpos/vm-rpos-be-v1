const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authMiddleware");
const usersControllers = require("../controllers/usersController");
// router.use(protect); // Protect all routes in this file

router.get("/:restaurantId", usersControllers.getUsersByRestaurant);

module.exports = router;
