// models/Animal.js
const mongoose = require('mongoose');

const AnimalSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },    // Cow, Goat, etc.
  breed: { type: String, required: true },
  age: { type: Number, required: true },     // years
  price: { type: Number, required: true },   // expected price in INR
  description: { type: String, default: '' },
  images: [String],                           // filenames saved in public/uploads
  location: {
    village: { type: String, required: true },
    taluk: { type: String, required: true },
    district: { type: String, required: true }
  },
  ownerPhone: {
    type: String,
    required: true,
    match: /^(\+91)?[6-9]\d{9}$/              // enforce Indian numbers
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Animal', AnimalSchema);
