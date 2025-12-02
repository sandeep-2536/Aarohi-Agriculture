const User = require("../models/User");

exports.getFarmersList = async (req, res) => {
    if (!req.session.user) return res.redirect("/auth/login");

    const farmers = await User.find({});
    res.render("call/farmersList", { farmers, user: req.session.user });
};

exports.getCallRoom = (req, res) => {
    if (!req.session.user) return res.redirect("/auth/login");
    console.log("video call feature is upto here\n");9
    res.render("call/videoCallRoom", {
        roomId: req.params.roomId,
        user: req.session.user
    });
};
