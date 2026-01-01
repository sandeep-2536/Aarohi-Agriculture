// routes/dealerAuthRoutes.js
const express = require('express');
const router = express.Router();
const dealerAuthController = require('../controllers/dealerAuthController');

router.get('/register', dealerAuthController.showRegister);
router.post('/register', dealerAuthController.register);

router.get('/login', dealerAuthController.showLogin);
router.post('/login', dealerAuthController.login);

router.get('/logout', dealerAuthController.logout);

module.exports = router;
