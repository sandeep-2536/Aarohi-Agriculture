const ChatRoom = require("../models/ChatRoom");
const Message = require("../models/Message");

exports.getChatPage = async (req, res) => {
    if (!req.session.user) return res.redirect("/auth/login");

    let room = await ChatRoom.findOne({ name: "Farmers Group Chat" });

    // If room doesn’t exist, create it once
    if (!room) {
        room = await ChatRoom.create({ name: "Farmers Group Chat" });
    }

    const messages = await Message.find({ roomId: room._id })
        .populate("user")
        .sort({ createdAt: 1 });

    res.render("community/communityChat", {
        user: req.session.user,
        room,
        messages
    });
};

// For AJAX Delete
exports.deleteMessage = async (req, res) => {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
};

// For AJAX Edit
exports.updateMessage = async (req, res) => {
    await Message.findByIdAndUpdate(req.params.id, {
        text: req.body.text,
        edited: true
    });chatRoutes.js
    res.json({ success: true });
};
