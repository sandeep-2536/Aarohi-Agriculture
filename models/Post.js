const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",      // Connects directly to User Schema
        required: true
    },
    text: {
        type: String,
        required: true
    },
    image: {
        type: String,     // Optional image URL/path from Multer
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Post", postSchema);
