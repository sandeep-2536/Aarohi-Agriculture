// routes/vetAuthRoutes.js
const express = require("express");
const router = express.Router();
const vetAuthController = require("../controllers/vetAuthController");

router.get("/register", vetAuthController.showRegister);
router.post("/register", vetAuthController.register);

router.get("/login", vetAuthController.showLogin);
router.post("/login", vetAuthController.login);

router.get("/logout", vetAuthController.logout);

module.exports = router;
