const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const upload = require("../helpers/upload");

// Show group chat
router.get("/", chatController.getChatPage);

// Upload image
router.post("/upload", upload.single("image"), (req, res) => {
    if (req.file) {
        res.json({ path: "/uploads/" + req.file.filename });
    } else {
        res.status(400).json({ error: "No file uploaded" });
    }
});

// Edit message (AJAX)
router.put("/message/:id", chatController.updateMessage);

// Delete message (AJAX)
router.delete("/message/:id", chatController.deleteMessage);

module.exports = router;
