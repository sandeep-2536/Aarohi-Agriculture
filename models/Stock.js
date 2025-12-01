// models/Stock.js
const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer', required: true },
  title: { type: String, required: true },         // e.g., "Urea 50kg"
  category: { type: String, required: true },      // Seed / Fertilizer / Pesticide / Tools
  brand: { type: String, default: '' },
  variety: { type: String, default: '' },
  quantity: { type: Number, required: true },      // total available quantity
  quantityUnit: { type: String, default: 'Kg' },   // Kg, Bags, Litre etc.
  price: { type: Number, required: true },         // price per unit or per bag
  availability: { type: String, enum: ['IN_STOCK','OUT_OF_STOCK'], default: 'IN_STOCK' },
  image: { type: String, default: '' },
  shopName: { type: String, default: '' },
  phone: {
    type: String,
    required: true,
    match: /^(\+91)?[6-9]\d{9}$/
  },
  location: {
    village: String,
    taluk: String,
    district: String
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Stock', StockSchema);
