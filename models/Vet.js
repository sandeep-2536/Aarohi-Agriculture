// models/Vet.js
const mongoose = require("mongoose");

const VetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: /^(\+91)?[6-9]\d{9}$/ // Indian phone
  },
  specialization: { type: String, default: "" }, // e.g. "Cows, Buffalo"
  password: { type: String, required: true },    // PLAIN for now (hash later)
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Vet", VetSchema);
