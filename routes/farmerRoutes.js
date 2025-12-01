const express = require('express');
const router = express.Router();
const farmerController = require('../controllers/farmerController');

router.get('/dashboard', farmerController.dashboard);
router.get('/community', farmerController.community);
router.get('/inventory', farmerController.inventory);
router.get('/livestock', farmerController.livestock);
router.get('/marketplace', farmerController.marketplace);

module.exports = router;
