const express = require("express");
const router = express.Router();
const protect = require("../middlewares/authMiddleware");
const usersControllers = require("../controllers/usersController");
// router.use(protect); // Protect all routes in this file

router.get("/:restaurantId", usersControllers.getUsersByRestaurant);
router.get("/single/:id", usersControllers.getUserById);
router.put("/:id", usersControllers.editUserById);
router.delete("/:id", usersControllers.deleteUserById);
module.exports = router;
