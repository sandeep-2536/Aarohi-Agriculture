const express = require("express");
const router = express.Router();
const voiceController = require("../controllers/voiceController");

router.post("/navigate", voiceController.processNavigation);

module.exports = router;
