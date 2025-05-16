const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");
const protect = require("../middlewares/authMiddleware");

router.use(protect); // Protect all routes in this file

router.get("/", restaurantController.getAllRestaurants);
router.get("/:id", restaurantController.getRestaurantById);
router.post("/", restaurantController.createRestaurant);
router.post("/uploadQrImage/:id",upload.single("qrImage"), restaurantController.uploadQrImage);
router.put("/:id", restaurantController.updateRestaurant);
router.delete("/:id", restaurantController.deleteRestaurant);
router.get("/restaurantname/:id", restaurantController.getRestaurantName);

module.exports = router;
