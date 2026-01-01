const express = require("express");
const router = express.Router();
const upload = require("../helpers/upload");
const communityProblemController = require("../controllers/communityProblemController");

// Show all problems
router.get("/", communityProblemController.getAllProblems);

// Show create form
router.get("/new", communityProblemController.getCreateForm);

// Create new problem
router.post("/new", upload.single("image"), communityProblemController.createProblem);

// Problem details
router.get("/:id", communityProblemController.getProblemById);

// Add comment
router.post("/:id/comment", communityProblemController.addComment);

module.exports = router;
