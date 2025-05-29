const express = require("express");
const router = express.Router();
const supercontroller = require("../controllers/superController");

router.get("/", supercontroller.getAllSupers);
router.get("/user/:userId", supercontroller.getSuperByUserId);

module.exports = router;
