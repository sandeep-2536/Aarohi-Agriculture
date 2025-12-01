// models/Crop.js
const mongoose = require('mongoose');

const CropSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cropName: { type: String, required: true },         // e.g., Wheat, Rice
  variety: { type: String, default: '' },             // e.g., Basmati
  quantity: { type: Number, required: true },         // numeric value
  quantityUnit: { type: String, required: true },     // Kg, Quintal, Ton, Bags
  priceType: { type: String, enum: ['per_unit','total'], default: 'per_unit' },
  expectedPrice: { type: Number, required: true },    // if priceType is per_unit -> price per unit; else total price
  description: { type: String, default: '' },
  images: [String],
  location: {
    village: { type: String, required: true },
    taluk: { type: String, required: true },
    district: { type: String, required: true }
  },
  ownerPhone: {
    type: String,
    required: true,
    match: /^(\+91)?[6-9]\d{9}$/  // Indian number enforcement
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Crop', CropSchema);
