const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

// Dedicated weather page route
router.get('/', weatherController.getWeatherPage);

module.exports = router;