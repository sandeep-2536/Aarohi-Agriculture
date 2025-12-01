// routes/cropRoutes.js
const express = require('express');
const router = express.Router();
const cropController = require('../controllers/cropController');
const upload = require('../helpers/upload');
const isAuth = require('../middlewares/isAuth');

// GET /crops
router.get('/', isAuth, cropController.listCrops);

// GET /crops/new
router.get('/new', isAuth, cropController.showAddForm);

// POST /crops  (upload up to 6 images)
router.post('/', isAuth, upload.array('images', 6), cropController.addCrop);

// GET /crops/:id
router.get('/:id', isAuth, cropController.cropDetails);

// POST /crops/:id/delete
router.post('/:id/delete', isAuth, cropController.deleteCrop);

module.exports = router;
