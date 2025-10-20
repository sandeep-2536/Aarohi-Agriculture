// models/comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  text: String,
  author: String,
  date: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }
});

module.exports = mongoose.model('Comment', commentSchema);
