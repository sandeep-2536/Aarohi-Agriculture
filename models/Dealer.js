// models/Dealer.js
const mongoose = require('mongoose');

const DealerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shopName: { type: String, default: '' },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: /^(\+91)?[6-9]\d{9}$/
  },
  passwordHash: { type: String, required: true }, // store hashed password
  location: {
    village: String,
    taluk: String,
    district: String
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Dealer', DealerSchema);
