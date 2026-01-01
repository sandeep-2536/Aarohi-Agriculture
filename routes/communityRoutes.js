const express = require("express");
const router = express.Router();
const communityController = require("../controllers/communityController");
const upload = require("../helpers/upload");

// Show community feed
router.get("/", communityController.getCommunityPage);

// Create a new post (with optional image)
router.post("/create", upload.single("image"), communityController.createPost);

// View a single post
router.get("/post/:id", communityController.getPost);

// Add comment
router.post("/post/:id/comment", communityController.addComment);

module.exports = router;
