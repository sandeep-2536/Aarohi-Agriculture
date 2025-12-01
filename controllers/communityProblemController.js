const Post = require("../models/Post");
const Comment = require("../models/Comment");

exports.getAllProblems = async (req, res) => {
    if (!req.session.user) return res.redirect("/auth/login");

    const problems = await Post.find()
        .populate("user")
        .sort({ createdAt: -1 });

    res.render("community/problems/communityProblems", { problems, user: req.session.user });
};

exports.getCreateForm = (req, res) => {
    if (!req.session.user) return res.redirect("/auth/login");

    res.render("community/problems/newProblem", { user: req.session.user });
};

exports.createProblem = async (req, res) => {
    const { text } = req.body;

    await Post.create({
        user: req.session.user._id,
        text,
        image: req.file ? "/uploads/" + req.file.filename : null
    });

    res.redirect("/community/problems");
};

exports.getProblemById = async (req, res) => {
    const problem = await Post.findById(req.params.id).populate("user");
    const comments = await Comment.find({ post: req.params.id }).populate("user");

    res.render("community/problems/problemDetails", { problem, comments, user: req.session.user });
};

exports.addComment = async (req, res) => {
    const { text } = req.body;

    await Comment.create({
        post: req.params.id,
        user: req.session.user._id,
        text
    });

    res.redirect(`/community/problems/${req.params.id}`);
};
