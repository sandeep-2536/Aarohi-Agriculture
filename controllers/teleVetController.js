// controllers/teleVetController.js
const Vet = require("../models/Vet");
const User = require("../models/User");
const VideoCall = require("../models/VideoCall");

// ==================== FARMER CONTROLLERS ====================

/**
 * Show list of available vets for farmer
 * GET /televet/vets
 */
exports.showVetList = async (req, res) => {
  try {
    const vets = await Vet.find({}).select("-password").sort({ name: 1 });
    
    res.render("televet/vet-list", {
      vets,
      farmer: req.session.user
    });
  } catch (error) {
    console.error("Error fetching vets:", error);
    res.status(500).render("error", {
      message: req.__("Error loading veterinarians"),
      error: error
    });
  }
};

/**
 * Initiate video call from farmer to vet
 * POST /televet/call/initiate/:vetId
 */
exports.initiateCall = async (req, res) => {
  try {
    const { vetId } = req.params;
    const farmerId = req.session.user._id;

    // Validate vet exists
    const vet = await Vet.findById(vetId);
    if (!vet) {
      return res.status(404).json({ 
        success: false, 
        message: req.__("Veterinarian not found") 
      });
    }

    // Validate farmer exists
    const farmer = await User.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ 
        success: false, 
        message: req.__("Farmer not found") 
      });
    }

    // Check if there's already a pending call from this farmer to this vet
    const existingCall = await VideoCall.findOne({
      farmerId,
      vetId,
      status: { $in: ["pending", "accepted", "active"] }
    });

    if (existingCall) {
      return res.json({
        success: true,
        roomId: existingCall.roomId,
        callId: existingCall._id,
        vetName: vet.name,
        message: req.__("Rejoining existing call")
      });
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

    // Populate farmer data for notification
    const populatedCall = await VideoCall.findById(videoCall._id)
      .populate("farmerId", "name village state profileImage");

    // Notify vet via socket if online
    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');
    
    if (io && userSocketMap) {
      const vetSocketId = userSocketMap[vetId.toString()];
      
      if (vetSocketId) {
        io.to(vetSocketId).emit('new-call-for-vet', {
          callId: populatedCall._id,
          roomId: populatedCall.roomId,
          farmerId: populatedCall.farmerId._id,
          farmerName: populatedCall.farmerId.name,
          farmerImage: populatedCall.farmerId.profileImage,
          farmerLocation: `${populatedCall.farmerId.village || ''}, ${populatedCall.farmerId.state || ''}`,
          timestamp: populatedCall.createdAt
        });
        console.log(`[TeleVet] Notified vet ${vetId} of incoming call`);
      } else {
        console.log(`[TeleVet] Vet ${vetId} not connected to socket`);
      }
    }

    res.json({
      success: true,
      roomId: videoCall.roomId,
      callId: videoCall._id,
      vetName: vet.name
    });
  } catch (error) {
    console.error("Error initiating call:", error);
    res.status(500).json({ 
      success: false, 
      message: req.__("Failed to initiate call. Please try again.") 
    });
  }
};

/**
 * Get farmer's call history
 * GET /televet/farmer/history
 */
exports.getFarmerCallHistory = async (req, res) => {
  try {
    const farmerId = req.session.user._id;
    
    const calls = await VideoCall.find({ farmerId })
      .populate("vetId", "name specialization phone")
      .sort({ createdAt: -1 })
      .limit(20);

    res.render("televet/farmer-history", {
      calls,
      farmer: req.session.user
    });
  } catch (error) {
    console.error("Error fetching call history:", error);
    res.status(500).send("Error loading call history");
  }
};

// ==================== VET CONTROLLERS ====================

/**
 * Show vet dashboard with pending calls and history
 * GET /televet/vet/dashboard
 */
exports.showVetDashboard = async (req, res) => {
  try {
    const vetId = req.session.vet._id;

    // Get pending calls
    const pendingCalls = await VideoCall.find({
      vetId,
      status: "pending"
    })
      .populate("farmerId", "name village state profileImage farmerType")
      .sort({ createdAt: -1 });

    // Get active calls (in case vet refreshed page during call)
    const activeCalls = await VideoCall.find({
      vetId,
      status: { $in: ["accepted", "active"] }
    })
      .populate("farmerId", "name village state profileImage")
      .sort({ acceptedAt: -1 });

    // Get recent call history
    const callHistory = await VideoCall.find({
      vetId,
      status: { $in: ["ended", "rejected"] }
    })
      .populate("farmerId", "name village state profileImage")
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate stats
    const totalCalls = await VideoCall.countDocuments({ vetId });
    const completedCalls = await VideoCall.countDocuments({ 
      vetId, 
      status: "ended" 
    });
    const todayCalls = await VideoCall.countDocuments({
      vetId,
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });

    res.render("televet/vet-dashboard", {
      vet: req.session.vet,
      pendingCalls,
      activeCalls,
      callHistory,
      stats: {
        total: totalCalls,
        completed: completedCalls,
        today: todayCalls
      }
    });
  } catch (error) {
    console.error("Error loading vet dashboard:", error);
    res.status(500).render("error", {
      message: req.__("Error loading dashboard"),
      error: error
    });
  }
};

/**
 * Accept incoming call
 * POST /televet/call/accept/:callId
 */
exports.acceptCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const vetId = req.session.vet._id;

    const call = await VideoCall.findOne({ 
      _id: callId, 
      vetId,
      status: "pending" 
    });
    
    if (!call) {
      return res.status(404).json({ 
        success: false, 
        message: req.__("Call not found or already handled") 
      });
    }

    // Update call status
    call.status = "accepted";
    call.acceptedAt = new Date();
    await call.save();

    // Notify farmer that call was accepted
    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');
    
    if (io && userSocketMap) {
      const farmerSocketId = userSocketMap[call.farmerId.toString()];
      if (farmerSocketId) {
        io.to(farmerSocketId).emit('call-accepted', {
          callId: call._id,
          roomId: call.roomId,
          vetName: req.session.vet.name
        });
        console.log(`[TeleVet] Notified farmer ${call.farmerId} that call was accepted`);
      }
    }

    res.json({
      success: true,
      roomId: call.roomId,
      message: req.__("Call accepted successfully")
    });
  } catch (error) {
    console.error("Error accepting call:", error);
    res.status(500).json({ 
      success: false, 
      message: req.__("Failed to accept call") 
    });
  }
};

/**
 * Reject incoming call
 * POST /televet/call/reject/:callId
 */
exports.rejectCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const vetId = req.session.vet._id;

    const call = await VideoCall.findOne({ 
      _id: callId, 
      vetId,
      status: "pending"
    });
    
    if (!call) {
      return res.status(404).json({ 
        success: false, 
        message: req.__("Call not found") 
      });
    }

    call.status = "rejected";
    call.endTime = new Date();
    await call.save();

    // Notify farmer that call was rejected
    const io = req.app.get('socketio');
    const userSocketMap = req.app.get('userSocketMap');
    
    if (io && userSocketMap) {
      const farmerSocketId = userSocketMap[call.farmerId.toString()];
      if (farmerSocketId) {
        io.to(farmerSocketId).emit('call-rejected', {
          callId: call._id,
          message: req.__('The veterinarian is not available')
        });
        console.log(`[TeleVet] Notified farmer ${call.farmerId} that call was rejected`);
      }
    }

    res.json({ 
      success: true,
      message: req.__("Call rejected") 
    });
  } catch (error) {
    console.error("Error rejecting call:", error);
    res.status(500).json({ 
      success: false, 
      message: req.__("Failed to reject call") 
    });
  }
};

/**
 * Get vet's call history
 * GET /televet/vet/history
 */
exports.getVetCallHistory = async (req, res) => {
  try {
    const vetId = req.session.vet._id;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const calls = await VideoCall.find({ vetId })
      .populate("farmerId", "name village state profileImage farmerType")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCalls = await VideoCall.countDocuments({ vetId });
    const totalPages = Math.ceil(totalCalls / limit);

    res.render("televet/vet-history", {
      calls,
      vet: req.session.vet,
      pagination: {
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching call history:", error);
    res.status(500).send("Error loading call history");
  }
};

// ==================== COMMON CONTROLLERS ====================

/**
 * Show video call room
 * GET /televet/room/:roomId
 */
exports.showCallRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const user = req.session.user || req.session.vet;

    if (!user) {
      return res.redirect("/auth/login");
    }

    // Find the call
    const call = await VideoCall.findOne({ roomId })
      .populate("farmerId", "name profileImage village state farmerType")
      .populate("vetId", "name specialization phone");

    if (!call) {
      return res.status(404).render("error", {
        message: req.__("Call not found"),
        error: { status: 404 }
      });
    }

    // Check if call is still valid (not ended or rejected)
    if (call.status === "ended" || call.status === "rejected") {
      return res.redirect(
        req.session.user ? "/televet/vets" : "/televet/vet/dashboard"
      );
    }

    // Determine user role
    const userRole = req.session.user ? "farmer" : "vet";
    const userName = req.session.user ? req.session.user.name : req.session.vet.name;
    const userId = req.session.user ? req.session.user._id : req.session.vet._id;

    // Verify user is part of this call
    const isAuthorized = 
      (userRole === "farmer" && call.farmerId._id.toString() === userId.toString()) ||
      (userRole === "vet" && call.vetId._id.toString() === userId.toString());

    if (!isAuthorized) {
      return res.status(403).render("error", {
        message: req.__("You are not authorized to join this call"),
        error: { status: 403 }
      });
    }

    res.render("televet/call-room", {
      roomId,
      call,
      userRole,
      userName,
      userId,
      user
    });
  } catch (error) {
    console.error("Error loading call room:", error);
    res.status(500).render("error", {
      message: req.__("Error loading call room"),
      error: error
    });
  }
};

/**
 * End video call
 * POST /televet/call/end/:roomId
 */
exports.endCall = async (req, res) => {
  try {
    const { roomId } = req.params;

    const call = await VideoCall.findOne({ roomId });
    if (!call) {
      return res.status(404).json({ 
        success: false, 
        message: req.__("Call not found") 
      });
    }

    // Only end if not already ended
    if (call.status !== "ended") {
      call.status = "ended";
      call.endTime = new Date();
      await call.save();

      console.log(`[TeleVet] Call ${roomId} ended. Duration: ${call.duration}s`);
    }

    res.json({ 
      success: true,
      message: req.__("Call ended successfully") 
    });
  } catch (error) {
    console.error("Error ending call:", error);
    res.status(500).json({ 
      success: false, 
      message: req.__("Failed to end call") 
    });
  }
};

/**
 * Get call status
 * GET /televet/call/status/:callId
 */
exports.getCallStatus = async (req, res) => {
  try {
    const { callId } = req.params;

    const call = await VideoCall.findById(callId)
      .populate("farmerId", "name")
      .populate("vetId", "name");

    if (!call) {
      return res.status(404).json({ 
        success: false, 
        message: req.__("Call not found") 
      });
    }

    res.json({
      success: true,
      call: {
        id: call._id,
        roomId: call.roomId,
        status: call.status,
        farmerName: call.farmerId.name,
        vetName: call.vetId.name,
        startTime: call.startTime,
        acceptedAt: call.acceptedAt,
        endTime: call.endTime,
        duration: call.duration
      }
    });
  } catch (error) {
    console.error("Error getting call status:", error);
    res.status(500).json({ 
      success: false, 
      message: req.__("Failed to get call status") 
    });
  }
};