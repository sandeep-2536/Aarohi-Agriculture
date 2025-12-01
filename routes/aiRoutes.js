const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.get('/assistant', aiController.assistant);
router.post('/analyze', aiController.analyze);

module.exports = router;
