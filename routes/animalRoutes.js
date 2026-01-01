// routes/animalRoutes.js
const express = require('express');
const router = express.Router();
const animalController = require('../controllers/animalController');
const upload = require('../helpers/upload'); // multer instance
const isAuth = require('../middlewares/isAuth');

// GET /animals/    -> list
router.get('/', isAuth, animalController.listAnimals);

// GET /animals/new -> form
router.get('/new', isAuth, animalController.showAddForm);

// POST /animals/   -> create (images upto 5)
router.post('/', isAuth, upload.array('images', 5), animalController.addAnimal);

// GET /animals/:id -> details
router.get('/:id', isAuth, animalController.animalDetails);

// DELETE /animals/:id/delete
router.post('/:id/delete', isAuth, animalController.deleteAnimal);

module.exports = router;
