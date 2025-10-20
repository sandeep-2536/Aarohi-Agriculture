// models/Animal.js

const mongoose = require('mongoose');

const animalSchema = new mongoose.Schema({
    // seller: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'User',
    //     required: true
    // },
    type: {
        type: String,
        enum: ['cattle', 'sheep'],
        required: true
    },
    breed: {
        type: String,
        required: true,
        trim: true
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'unknown'],
        default: 'unknown'
    },
    age: {
        type: Number, // in months
        min: 0
    },
    weight: {
        type: Number, // in kg
        min: 0
    },
    location: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    images: {
        type: [String], // Array of image URLs
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'pending_sale', 'sold', 'removed'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
    // ... include other fields like age, weight, gender, location ...
});

module.exports = mongoose.model('Animal', animalSchema);