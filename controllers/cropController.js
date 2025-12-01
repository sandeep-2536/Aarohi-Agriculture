// controllers/cropController.js
const Crop = require('../models/Crop');
const path = require('path');
const fs = require('fs');

exports.listCrops = async (req, res) => {
  try {
    const crops = await Crop.find().sort({ createdAt: -1 }).populate('owner', 'name mobileNumber');
    res.render('crops/listCrops', { crops });
  } catch (err) {
    console.error('listCrops error', err);
    res.status(500).send('Server error');
  }
};

exports.showAddForm = (req, res) => {
  return res.render('crops/newCrop');
};

exports.addCrop = async (req, res) => {
  try {
    const seller = req.session.user;
    if (!seller) return res.redirect('/auth/login');

    const mobile = seller.mobileNumber;
    if (!/^(\+91)?[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).send('Invalid Indian mobile number in your profile. Please update your profile.');
    }

    const {
      cropName,
      variety = '',
      quantity,
      quantityUnit,
      priceType = 'per_unit',
      expectedPrice,
      description,
      village,
      taluk,
      district
    } = req.body;

    const images = req.files ? req.files.map(f => f.filename) : [];

    await Crop.create({
      owner: seller._id,
      cropName,
      variety,
      quantity: Number(quantity),
      quantityUnit,
      priceType,
      expectedPrice: Number(expectedPrice),
      description,
      images,
      location: { village, taluk, district },
      ownerPhone: mobile
    });

    return res.redirect('/crops');
  } catch (err) {
    console.error('addCrop error', err);
    return res.status(500).send('Error saving crop listing');
  }
};

exports.cropDetails = async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id).populate('owner', 'name mobileNumber');
    if (!crop) return res.status(404).send('Listing not found');
    return res.render('crops/cropDetails', { crop });
  } catch (err) {
    console.error('cropDetails error', err);
    return res.status(500).send('Server error');
  }
};

exports.deleteCrop = async (req, res) => {
  try {
    const cropId = req.params.id;
    const userId = req.session.user && req.session.user._id;
    const crop = await Crop.findById(cropId);

    if (!crop) return res.status(404).send('Listing not found');

    // Security: only owner can delete
    if (crop.owner.toString() !== userId.toString()) {
      return res.status(403).send('You are not allowed to delete this listing');
    }

    // Delete images from uploads folder
    if (crop.images && crop.images.length > 0) {
      crop.images.forEach(img => {
        const imgPath = path.join(__dirname, '..', 'public', 'uploads', img);
        try {
          if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        } catch (e) {
          console.warn('Could not delete image', imgPath, e);
        }
      });
    }

    await Crop.findByIdAndDelete(cropId);
    return res.redirect('/crops');
  } catch (err) {
    console.error('deleteCrop error', err);
    return res.status(500).send('Error deleting listing');
  }
};
