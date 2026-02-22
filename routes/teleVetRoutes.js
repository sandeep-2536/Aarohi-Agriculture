// routes/teleVetRoutes.js - UPDATED VERSION with socket notification
const express = require("express");
const router = express.Router();
const Vet = require("../models/Vet");
const User = require("../models/User");
const VideoCall = require("../models/VideoCall");

// This will be set by app.js
let io = null;
let userSocketMap = null;

// Function to set socket.io instance
router.setSocketIO = (socketIO, socketMap) => {
  io = socketIO;
  userSocketMap = socketMap;
};

// Helper to detect JSON/AJAX requests
const isJsonRequest = (req) => {
  try {
    return req.xhr ||
      (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) ||
      (req.get && req.get('X-Requested-With') === 'XMLHttpRequest');
  } catch (e) {
    return false;
  }
};

// Middleware to check if farmer is logged in
const isFarmerAuth = (req, res, next) => {
  if (!req.session.user) {
    if (isJsonRequest(req)) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    return res.redirect('/auth/login');
  }
  next();
};

// Middleware to check if vet is logged in
const isVetAuth = (req, res, next) => {
  if (!req.session.vet) {
    if (isJsonRequest(req)) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    return res.redirect('/vet-auth/login');
  }
  next();
};

// ==================== FARMER ROUTES ====================

// Show list of vets for farmer
router.get("/", async (req, res) => {
  try {
    const vets = await Vet.find({}).select("-password");
    res.render("teleVet/vetList", {
      vets,
      farmer: req.session.user
    });
  } catch (error) {
    console.error("Error fetching vets:", error);
    res.status(500).send("Error loading vets");
  }
});

// Farmer initiates call with vet (GET request to show confirmation page)
router.get("/farmer/call/:vetId", isFarmerAuth, async (req, res) => {
  try {
    const { vetId } = req.params;
    const vet = await Vet.findById(vetId).select("-password");
    
    if (!vet) {
      return res.status(404).send("Veterinarian not found");
    }

    res.render("teleVet/farmerCall", {
      vet,
      farmer: req.session.user
    });
  } catch (error) {
    console.error("Error loading call page:", error);
    res.status(500).send("Error loading call page");
  }
});

// Initiate call from farmer to vet - WITH PROPER SOCKET NOTIFICATION
router.post("/call/initiate/:vetId", isFarmerAuth, async (req, res) => {
  try {
    const { vetId } = req.params;
    const farmerId = req.session.user._id;

    console.log('[TeleVet] 📞 Call initiate request - farmerId:', farmerId, 'vetId:', vetId);

    // Check if vet exists
    const vet = await Vet.findById(vetId);
    if (!vet) {
      console.log('[TeleVet] ✗ Vet not found:', vetId);
      return res.status(404).json({ success: false, message: "Vet not found" });
    }

    // Check if farmer exists
    const farmer = await User.findById(farmerId);
    if (!farmer) {
      console.log('[TeleVet] ✗ Farmer not found:', farmerId);
      return res.status(404).json({ success: false, message: "Farmer not found" });
    }

    // Create unique room ID
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create video call record
    const videoCall = await VideoCall.create({
      roomId,
      farmerId,
      vetId,
      status: "pending"
    });

    console.log('[TeleVet] ✓ VideoCall created:', videoCall._id, 'roomId:', roomId);

    // Populate farmer data for notification
    const populatedCall = await VideoCall.findById(videoCall._id)
      .populate("farmerId", "name village state profileImage");

    // CRITICAL: Notify vet via socket if online
    if (io && userSocketMap) {
      const vetSocketId = userSocketMap[vetId.toString()];
      
      if (vetSocketId) {
        // Use consistent event name: 'new-call-for-vet'
        io.to(vetSocketId).emit('new-call-for-vet', {
          callId: populatedCall._id,
          roomId: populatedCall.roomId,
          farmerId: populatedCall.farmerId._id,
          farmerName: populatedCall.farmerId.name,
          farmerImage: populatedCall.farmerId.profileImage,
          farmerLocation: `${populatedCall.farmerId.village || ''}, ${populatedCall.farmerId.state || ''}`,
          timestamp: populatedCall.createdAt
        });

        console.log(`[TeleVet] ✓ VET NOTIFIED: ${vetId} received 'new-call-for-vet' event (socketId: ${vetSocketId})`);
      } else {
        console.log(`[TeleVet] ⚠ Vet ${vetId} NOT ONLINE (not in userSocketMap). Call pending.`);
        console.log(`[TeleVet] ℹ Active sockets: ${Object.keys(userSocketMap).join(', ') || 'none'}`);
      }
    } else {
      console.warn('[TeleVet] ✗ io or userSocketMap not initialized');
    }

    res.json({
      success: true,
      roomId: videoCall.roomId,
      callId: videoCall._id,
      vetName: vet.name
    });
  } catch (error) {
    console.error("[TeleVet] ✗ Error initiating call:", error.message, error.stack);
    res.status(500).json({ success: false, message: "Failed to initiate call", error: error.message });
  }
});

// Vet dashboard - shows pending calls
router.get("/vet/dashboard", isVetAuth, async (req, res) => {
  try {
    const vetId = req.session.vet._id;

    // Get pending calls
    const pendingCalls = await VideoCall.find({
      vetId,
      status: "pending"
    })
      .populate("farmerId", "name village state profileImage")
      .sort({ createdAt: -1 });

    // Get recent call history
    const callHistory = await VideoCall.find({
      vetId,
      status: { $in: ["ended", "rejected"] }
    })
      .populate("farmerId", "name village state profileImage")
      .sort({ createdAt: -1 })
      .limit(10);

    res.render("teleVet/vetDashboard", {
      vet: req.session.vet,
      pendingCalls,
      callHistory
    });
  } catch (error) {
    console.error("Error loading vet dashboard:", error);
    res.status(500).send("Error loading dashboard");
  }
});

// Alias for doctor dashboard (same as vet dashboard)
router.get("/doctor/dashboard", isVetAuth, async (req, res) => {
  res.redirect("/televet/vet/dashboard");
});

// Accept call
router.post("/call/accept/:callId", isVetAuth, async (req, res) => {
  try {
    const { callId } = req.params;
    const vetId = req.session.vet._id;

    console.log('[TeleVet] ✓ VET ACCEPTING call:', callId);

    const call = await VideoCall.findOne({ _id: callId, vetId });
    if (!call) {
      console.log('[TeleVet] ✗ Call not found:', callId);
      return res.status(404).json({ success: false, message: "Call not found" });
    }

    call.status = "accepted";
    call.acceptedAt = new Date();
    await call.save();

    console.log('[TeleVet] ✓ Call status updated to ACCEPTED. roomId:', call.roomId);

    // Notify farmer that call was accepted
    if (io && userSocketMap) {
      const farmerSocketId = userSocketMap[call.farmerId.toString()];
      if (farmerSocketId) {
        io.to(farmerSocketId).emit('call-accepted', {
          callId: call._id,
          roomId: call.roomId,
          vetName: req.session.vet.name
        });
        console.log(`[TeleVet] ✓ FARMER NOTIFIED: ${call.farmerId} received 'call-accepted' event`);
      } else {
        console.log(`[TeleVet] ⚠ Farmer ${call.farmerId} NOT ONLINE`);
      }
    }

    res.json({
      success: true,
      roomId: call.roomId,
      message: 'Call accepted'
    });
  } catch (error) {
    console.error("✗ [TeleVet] Error accepting call:", error);
    res.status(500).json({ success: false, message: "Failed to accept call" });
  }
});

// Reject call
router.post("/call/reject/:callId", isVetAuth, async (req, res) => {
  try {
    const { callId } = req.params;
    const vetId = req.session.vet._id;

    console.log('[TeleVet] ✗ VET REJECTING call:', callId);

    const call = await VideoCall.findOne({ _id: callId, vetId });
    if (!call) {
      console.log('[TeleVet] ✗ Call not found:', callId);
      return res.status(404).json({ success: false, message: "Call not found" });
    }

    call.status = "rejected";
    call.endTime = new Date();
    await call.save();

    console.log('[TeleVet] ✓ Call status updated to REJECTED');

    // Notify farmer that call was rejected
    if (io && userSocketMap) {
      const farmerSocketId = userSocketMap[call.farmerId.toString()];
      if (farmerSocketId) {
        io.to(farmerSocketId).emit('call-rejected', {
          callId: call._id,
          message: 'The veterinarian is not available'
        });
        console.log(`[TeleVet] ✓ FARMER NOTIFIED: ${call.farmerId} received 'call-rejected' event`);
      }
    }

    res.json({
      success: true,
      message: 'Call rejected'
    });
  } catch (error) {
    console.error("✗ [TeleVet] Error rejecting call:", error);
    res.status(500).json({ success: false, message: "Failed to reject call" });
  }
});

// ==================== CALL ROOM ====================

// Video call room (for both farmer and vet)
router.get("/room/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const user = req.session.user || req.session.vet;

    if (!user) {
      return res.redirect("/auth/login");
    }

    // Find the call
    const call = await VideoCall.findOne({ roomId })
      .populate("farmerId", "name profileImage village state")
      .populate("vetId", "name specialization phone");

    if (!call) {
      return res.status(404).send("Call not found");
    }

    // Determine user role
    const userRole = req.session.user ? "farmer" : "vet";
    const userName = req.session.user ? req.session.user.name : req.session.vet.name;
    const userId = req.session.user ? req.session.user._id : req.session.vet._id;

    res.render("teleVet/call-room", {
      roomId,
      call,
      userRole,
      userName,
      userId,
      user
    });
  } catch (error) {
    console.error("Error loading call room:", error);
    res.status(500).send("Error loading call room");
  }
});

// End call
router.post("/call/end/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;

    const call = await VideoCall.findOne({ roomId });
    if (!call) {
      return res.status(404).json({ success: false, message: "Call not found" });
    }

    call.status = "ended";
    call.endTime = new Date();
    await call.save();

    res.json({ success: true });
  } catch (error) {
    console.error("Error ending call:", error);
    res.status(500).json({ success: false, message: "Failed to end call" });
  }
});

module.exports = router;