const express = require("express");
const router = express.Router();
const callController = require("../controllers/callController");

// List all farmers to call
router.get("/farmers", callController.getFarmersList);

// Call room
router.get("/room/:roomId", callController.getCallRoom);

module.exports = router;
