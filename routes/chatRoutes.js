const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const upload = require("../helpers/upload");

// Show group chat
router.get("/", chatController.getChatPage);

// Edit message (AJAX)
router.put("/message/:id", chatController.updateMessage);

// Delete message (AJAX)
router.delete("/message/:id", chatController.deleteMessage);

module.exports = router;
