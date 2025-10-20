const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');

// ✅ Separate database connection for crop supply
const supplyDB = mongoose.createConnection('mongodb://127.0.0.1:27017/crop_supply');

const createCropModel = require('../models/crop');
const Crop = createCropModel(supplyDB);//(supplyDB)

// ✅ Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ✅ Show all crops
router.get('/', async (req, res) => {
  const crops = await Crop.find().sort({ date: -1 });
  res.render('crops/index', { crops });
});

// ✅ New crop form
router.get('/new', (req, res) => {
  res.render('crops/new');
});

// ✅ Upload new crop
router.post('/', upload.single('image'), async (req, res) => {
  const newCrop = new Crop({
    name: req.body.name,
    type: req.body.type,
    quantity: req.body.quantity,
    region: req.body.region,
    pricePerKg: req.body.pricePerKg,
    farmerName: req.body.farmerName,
    contact: req.body.contact,
    image: req.file ? `/uploads/${req.file.filename}` : null
  });
  await newCrop.save();
  res.redirect('/features/crops');
});

// ✅ Show one crop
router.get('/:id', async (req, res) => {
  const crop = await Crop.findById(req.params.id);
  res.render('crops/show', { crop });
});

module.exports = router;
