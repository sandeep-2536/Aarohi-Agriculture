const Post = require("../models/Post");
const Comment = require("../models/Comment");

exports.getDashboard = async (req, res) => {
    if (!req.session.user) return res.redirect("/auth/login");

    const userId = req.session.user._id;

    // Fetch all problems posted by this user
    const myProblems = await Post.find({ user: userId })
        .sort({ createdAt: -1 });

    res.render("dashboard/dashboard", {
        user: req.session.user,
        myProblems
    });
};
