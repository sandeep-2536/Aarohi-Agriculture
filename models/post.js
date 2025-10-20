// models/post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: String,
  image: String, // store image filename or URL
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
