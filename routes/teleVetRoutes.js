// routes/teleVetRoutes.js
const express = require("express");
const router = express.Router();
const teleVetController = require("../controllers/teleVetController");
const isAuth = require("../middlewares/isAuth");
const isVetAuth = require("../middlewares/isVetAuth");

// Farmer side
router.get("/", teleVetController.listVets);
router.get("/farmer/call/:vetId", isAuth, teleVetController.farmerCallPage);

// Vet side
router.get("/doctor/dashboard", isVetAuth, teleVetController.vetDashboard);
router.get("/doctor/call", isVetAuth, teleVetController.doctorCallPage);

module.exports = router;
