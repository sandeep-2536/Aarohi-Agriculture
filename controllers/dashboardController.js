const Post = require("../models/Post");
const Comment = require("../models/Comment");

exports.getDashboard = async (req, res) => {
    if (!req.session.user) return res.redirect("/auth/login");

    const userId = req.session.user._id;

    try {
        // Fetch community posts by this user
        const myCommunityPosts = await Post.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(100);

        // Fetch comments by this user
        const myComments = await Comment.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(100);

        // Fetch problems (using Post model — filter by type if needed)
        const myProblems = await Post.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(100);

        // Fetch animals (stub — returns empty if model doesn't exist or user field not set)
        let myAnimals = [];
        try {
            const Animal = require("../models/Animal");
            myAnimals = await Animal.find({ user: userId }).limit(100);
        } catch (e) {
            console.warn('[dashboard] Animal model not available or error:', e.message);
        }

        // Fetch crops (stub — returns empty if model doesn't exist or user field not set)
        let myCrops = [];
        try {
            const Crop = require("../models/Crop");
            myCrops = await Crop.find({ user: userId }).limit(100);
        } catch (e) {
            console.warn('[dashboard] Crop model not available or error:', e.message);
        }

        // Vet calls (stub — returns empty)
        const myVetCalls = [];

        // AI searches (stub — returns empty)
        const myAISearches = [];

        // Stock views (stub — returns empty)
        const myStockViews = [];

        // Recent activity (mix of posts and comments, sorted by date)
        const recentActivity = []
            .concat(myCommunityPosts.map(p => ({
                type: p.type || 'post',
                text: p.title || 'Posted in community',
                date: p.createdAt
            })))
            .concat(myComments.map(c => ({
                type: 'comment',
                text: 'Added a comment',
                date: c.createdAt
            })))
            .concat(myProblems.map(p => ({
                type: 'problem',
                text: p.title || 'Reported a problem',
                date: p.createdAt
            })))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

        res.render("dashboard/dashboard", {
            user: req.session.user,
            myCommunityPosts,
            myComments,
            myProblems,
            myAnimals,
            myCrops,
            myVetCalls,
            myAISearches,
            myStockViews,
            recentActivity
        });
    } catch (err) {
        console.error('[dashboard] error:', err);
        res.status(500).render('dashboard/dashboard', {
            user: req.session.user,
            myCommunityPosts: [],
            myComments: [],
            myProblems: [],
            myAnimals: [],
            myCrops: [],
            myVetCalls: [],
            myAISearches: [],
            myStockViews: [],
            recentActivity: [],
            error: 'Error loading dashboard data'
        });
    }
};
