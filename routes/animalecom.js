// routes/animalRoutes.js - Combined Router and Controller Logic

const express = require('express');
const router = express.Router();
const Animal = require('../models/Animal'); 
const mongoose=require("mongoose");
const multer = require('multer');
const path = require('path');
// Assuming the Animal model is correctly linked, 
// e.g., via mongoose setup in app.js and the model file itself.

// --- Controller Logic Integrated ---
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));
/**
 * GET / - Display all active animals (Main listings page)
 */


// Set storage location and filename
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'public/uploads/animal-images');
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });


router.get('/', async (req, res) => {
    try {
        // Simple filtering based on query parameters (from the frontend form)
        const filter = {};
        if (req.query.type) {
            filter.type = req.query.type;
        }
        if (req.query.breed) {
            // Case-insensitive regex search for breed
            filter.breed = { $regex: req.query.breed, $options: 'i' }; 
        }
        
        // Find animals in the database, sorted by newest first and only 'active'
        const animals = await Animal.find({ status: 'active', ...filter }).sort({ createdAt: -1 });
        
        // Pass the fetched data to the EJS template for rendering
        res.render('animallisting', { 
            animals: animals,
            pageTitle: 'Available Livestock'
        });

    } catch (error) {
        console.error("Error fetching animals:", error);
        // Render an error page or show a message on the listings page
        res.render('animallisting', { animals: [], pageTitle: 'Error' }); 
    }
});

/**
 * GET /add - Show form to add a new animal
 * (Add 'ensureAuthenticated' and 'isSeller' middleware in a real app)
 */
router.get('/add', (req, res) => {
    res.render('add_animal', { pageTitle: 'List New Livestock' });
});

/**
 * POST /add - Handle form submission and create a new animal listing
 */
// Accept multiple files (name must match the input name in your form)
router.post('/add', upload.array('images', 6), async (req, res) => {
  try {
    const imagePaths = req.files.map(file => '/uploads/animal-images/' + file.filename);
    const { type, breed, price, description, gender, age, weight, location } = req.body;

    const newAnimal = new Animal({
      type,
      breed,
      gender,
      age,
      weight,
      location,
      price,
      description,
      images: imagePaths.length > 0 ? imagePaths : ['/images/default.png']
    });

    await newAnimal.save();
    res.redirect(`/features/animaltrading/${newAnimal._id}`);
  } catch (error) {
    console.error(error);
    res.render('add_animal', { pageTitle: 'List New Livestock', error: 'Failed to add listing. Please check input.' });
  }
});


/**
 * GET /:id - Display a single animal's details
 */
router.get('/:id', async (req, res) => {
    try {
        // Find by ID from the URL parameter
        const animal = await Animal.findById(req.params.id);
        
        if (!animal) {
            return res.status(404).render('404', { pageTitle: 'Not Found' });
        }

        res.render('animal_details', { 
            animal: animal,
            pageTitle: animal.breed
        });

    } catch (error) {
        console.error("Error fetching animal details:", error);
        // Handle invalid ID format as well (Mongoose CastError)
        res.status(500).send("Server Error");
    }
});

module.exports = router;