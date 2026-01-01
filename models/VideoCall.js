// models/VideoCall.js
const mongoose = require("mongoose");

const VideoCallSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  vetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vet",
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "active", "ended", "rejected"],
    default: "pending"
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number // in seconds
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate duration when call ends
VideoCallSchema.pre('save', function(next) {
  if (this.status === 'ended' && this.acceptedAt && this.endTime) {
    this.duration = Math.floor((this.endTime - this.acceptedAt) / 1000);
  }
  next();
});

module.exports = mongoose.model("VideoCall", VideoCallSchema);