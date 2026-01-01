const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Main dashboard route
router.get('/', dashboardController.getDashboard);

// Save location endpoint (called from dashboard modal)
router.post('/saveLocation', dashboardController.saveLocation);

module.exports = router;