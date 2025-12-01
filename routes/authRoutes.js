const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.get("/login", authController.showLogin);
router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/create-profile", authController.createProfile);

module.exports = router;
