const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");

// Community Feed Page
exports.getCommunityPage = async (req, res) => {
    // ensure user is logged in
    if (!req.session.user) {
        return res.redirect("/auth/login");
    }

    const posts = await Post.find()
        .populate("user")  // includes name, profileImage, village, state
        .sort({ createdAt: -1 });

    res.render("community/community", { user: req.session.user, posts });
};

// Create Post
exports.createPost = async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login");
    }

    const { text } = req.body;

    await Post.create({
        user: req.session.user._id,
        text,
        image: req.file ? "/uploads/" + req.file.filename : null
    });

    res.redirect("/community");
};

// View Single Post + Comments
exports.getPost = async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login");
    }

    const post = await Post.findById(req.params.id)
        .populate("user"); 

    const comments = await Comment.find({ post: req.params.id })
        .populate("user") // show commenter details
        .sort({ createdAt: 1 });

    res.render("community/postDetails", {
        user: req.session.user,
        post,
        comments
    });
};

// Add Comment
exports.addComment = async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/auth/login");
    }

    await Comment.create({
        post: req.params.id,
        user: req.session.user._id,
        text: req.body.text
    });

    res.redirect(`/community/post/${req.params.id}`);
};