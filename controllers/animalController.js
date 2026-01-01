// controllers/animalController.js
const Animal = require('../models/Animal');

exports.listAnimals = async (req, res) => {
  try {
    // simple list with newest first
    const animals = await Animal.find().sort({ createdAt: -1 }).populate('owner', 'name mobileNumber');
    res.render('animals/listAnimals', { animals });
  } catch (err) {
    console.error('listAnimals error', err);
    res.status(500).send('Server error');
  }
};

exports.showAddForm = (req, res) => {
  return res.render('animals/newAnimal');
};

exports.addAnimal = async (req, res) => {
  try {
    // get seller mobile from session (enforces that it's the logged in user)
    const seller = req.session.user;
    if (!seller) return res.redirect('/auth/login');

    const mobile = seller.mobileNumber;
    if (!/^(\+91)?[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).send('Invalid Indian mobile number in your profile. Please update your profile.');
    }

    const { type, breed, age, price, description, village, taluk, district } = req.body;

    const images = req.files ? req.files.map(f => f.filename) : [];

    await Animal.create({
      owner: seller._id,
      type,
      breed,
      age: Number(age),
      price: Number(price),
      description,
      images,
      location: { village, taluk, district },
      ownerPhone: mobile
    });

    return res.redirect('/animals');
  } catch (err) {
    console.error('addAnimal error', err);
    return res.status(500).send('Error saving listing');
  }
};

exports.animalDetails = async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id).populate('owner', 'name mobileNumber');
    if (!animal) return res.status(404).send('Listing not found');
    return res.render('animals/animalDetails', { animal });
  } catch (err) {
    console.error('animalDetails error', err);
    return res.status(500).send('Server error');
  }
};

const fs = require('fs');
const path = require('path');

exports.deleteAnimal = async (req, res) => {
  try {
    const animalId = req.params.id;
    const userId = req.session.user._id;

    const animal = await Animal.findById(animalId);

    if (!animal) return res.status(404).send("Listing not found");

    // SECURITY CHECK: Only the owner can delete the listing
    if (animal.owner.toString() !== userId.toString()) {
      return res.status(403).send("You are not allowed to delete this listing");
    }

    // Delete images from /public/uploads
    if (animal.images && animal.images.length > 0) {
      animal.images.forEach(img => {
        const imgPath = path.join(__dirname, '..', 'public', 'uploads', img);
        if (fs.existsSync(imgPath)) {
          fs.unlinkSync(imgPath);
        }
      });
    }

    // Delete listing
    await Animal.findByIdAndDelete(animalId);

    res.redirect("/animals");

  } catch (err) {
    console.error("deleteAnimal error:", err);
    res.status(500).send("Error deleting listing");
  }
};

