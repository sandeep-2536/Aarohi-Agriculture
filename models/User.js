const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    match: [/^[6-9]\d{9}$/, "Invalid Indian mobile number"],
  },
  profileImage: { type: String, default: "/images/default-user.png" },
  village: { type: String },
  state: { type: String },
  farmerType: {
    type: String,
    enum: ["Crop", "Dairy", "Both"],
    default: "Crop",
  },

  createdAt: { type: Date, default: Date.now },
});


module.exports = mongoose.model("User", userSchema);
