const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const Post = require('../models/post');
const Comment = require('../models/comment');

// ✅ MongoDB connection (ensure this is connected in app.js globally)
mongoose.createConnection('mongodb://127.0.0.1:27017/farmers_forum');

// ✅ Configure Multer for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/'); // ensure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ✅ Show all posts
router.get('/', async (req, res) => {
  const posts = await Post.find().sort({ date: -1 });
  res.render('posts/index', { posts });
});

// ✅ Form to create new post
router.get('/new', (req, res) => {
  res.render('posts/new');
});

// ✅ Create post (with optional image)
router.post('/', upload.single('image'), async (req, res) => {
  const newPost = new Post({
    title: req.body.title,
    content: req.body.content,
    author: req.body.author,
    image: req.file ? `/uploads/${req.file.filename}` : null
  });
  await newPost.save();
  res.redirect('/features/community');
});

// ✅ Show one post
router.get('/posts/:id', async (req, res) => {
  const post = await Post.findById(req.params.id);
  const comments = await Comment.find({ post: post._id });
  res.render('posts/show', { post, comments });
});

// ✅ Add comment
router.post('/posts/:id/comments', async (req, res) => {
  const comment = new Comment({
    text: req.body.text,
    author: req.body.author,
    post: req.params.id
  });
  await comment.save();
  res.redirect(`/features/community/posts/${req.params.id}`);
});

// ✅ Like comment
router.post('/comments/:id/like', async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
  res.redirect(`/features/community/posts/${comment.post}`);
});

// ✅ Dislike comment
router.post('/comments/:id/dislike', async (req, res) => {
  const comment = await Comment.findByIdAndUpdate(req.params.id, { $inc: { dislikes: 1 } });
  res.redirect(`/features/community/posts/${comment.post}`);
});
module.exports = router;
