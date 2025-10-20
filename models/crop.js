const mongoose = require('mongoose');

module.exports = (connection) => {
  const cropSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: String, // e.g., wheat, rice, seed, etc.
    quantity: Number, // in kg or tons
    region: String,
    pricePerKg: Number,
    image: String,
    farmerName: String,
    contact: String,
    date: { type: Date, default: Date.now }
  });

  return connection.model('Crop', cropSchema);
};
