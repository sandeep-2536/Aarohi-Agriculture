// routes/stockRoutes.js
const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const dealerController = require('../controllers/dealerController');
const dealerAuth = require('../middlewares/isDealerAuth');
const upload = require('../helpers/upload');
const isAuth = require('../middlewares/isAuth');

// Dealer routes (manage stock) - placed BEFORE '/:id' to avoid route collisions
router.get('/dealer/new', dealerAuth, stockController.showAddForm);
router.post('/dealer/new', dealerAuth, upload.single('image'), stockController.addStock);

router.get('/dealer/:id/edit', dealerAuth, stockController.showEditForm);
router.post('/dealer/:id/edit', dealerAuth, upload.single('image'), stockController.updateStock);

router.post('/dealer/:id/delete', dealerAuth, stockController.deleteStock);

// Dealer dashboard
router.get('/dealer', dealerAuth, dealerController.dashboard);

// Farmer views & search (place after dealer-specific routes)
router.get('/', stockController.listStocks);
router.get('/:id', stockController.stockDetails);

module.exports = router;
