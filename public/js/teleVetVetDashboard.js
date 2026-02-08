// public/js/teleVetVetDashboard.js
(function () {
  const socket = io();

  // Get vet ID from global window.CURRENT_VET (set in vetDashboard.ejs)
  console.log('[teleVetVetDashboard] 🔧 window.CURRENT_VET:', window.CURRENT_VET);

  const vetId = window.CURRENT_VET ? window.CURRENT_VET._id : null;
  const vetName = window.CURRENT_VET ? window.CURRENT_VET.name : 'Doctor';

  if (!vetId) {
    console.error('[teleVetVetDashboard] ✗ NO vetId - not authenticated?');
    return;
  }

  // Get incoming call UI elements (support multiple possible selectors)
  const incomingBox = document.getElementById("incomingCallBox") || document.getElementById('incomingCallModal');
  const incomingText = document.getElementById("incomingText") || document.getElementById('incomingFrom');
  const acceptBtn = document.getElementById("acceptBtn") || document.getElementById('acceptCallBtn');
  const rejectBtn = document.getElementById("rejectBtn") || document.getElementById('rejectCallBtn');

  let currentCallData = null; // Store full call data (callId, roomId, etc.)

  // ==================== SOCKET REGISTRATION ====================
  
  /**
   * Register vet with socket server as soon as connected
   * This puts the vet's ID -> socketId mapping in userSocketMap on the server
   */
  function registerVet() {
    try {
      if (!socket.connected) {
        console.warn('[teleVetVetDashboard] ⚠ socket not connected yet, deferring register');
        return;
      }
      
      console.log('[teleVetVetDashboard] 📝 Registering vet:', { vetId, socket: socket.id });
      socket.emit("register", vetId);
    } catch (e) {
      console.error('[teleVetVetDashboard] ✗ register error:', e);
    }
  }

  // Listen for socket connection
  socket.on('connect', () => {
    console.log('[teleVetVetDashboard] ✓ Socket connected:', socket.id);
    registerVet(); // Register immediately on connect
  });

  // Listen for registration acknowledgment from server
  socket.on('register-ack', ({ userId, socketId }) => {
    console.log('[teleVetVetDashboard] ✓ Registration ACK - server confirmed:', { userId, socketId });
  });

  // ==================== INCOMING CALL LISTENER ====================

  /**
   * Listen for incoming call notification from farmer
   * Event emitted from: teleVetRoutes.js -> io.to(vetSocketId).emit('new-call-for-vet', ...)
   */
  socket.on("new-call-for-vet", ({ callId, roomId, farmerId, farmerName, farmerImage, farmerLocation, timestamp }) => {
    console.log('[teleVetVetDashboard] ☎️  INCOMING CALL:', {
      callId,
      roomId,
      farmerName,
      farmerLocation,
      timestamp: new Date(timestamp).toLocaleTimeString()
    });

    // Store call data for accept/reject handlers
    currentCallData = { callId, roomId, farmerId, farmerName, farmerImage, farmerLocation };

    // Show incoming call popup
    if (incomingText) {
      incomingText.innerText = `📞 Incoming call from ${farmerName}`;
      if (farmerLocation) {
        incomingText.innerText += ` (${farmerLocation})`;
      }
    }
    
    if (incomingBox) {
      incomingBox.style.display = "block";
      incomingBox.classList.add('animate-pulse');
    }
  });

  // ==================== CALL CONTROL BUTTONS ====================

  function addSafeListener(el, event, fn) {
    if (!el) {
      console.warn('[teleVetVetDashboard] ⚠ Element not found for:', event);
      return;
    }
    el.addEventListener(event, fn);
  }

  /**
   * Accept Call Button
   * POST to /televet/call/accept/:callId
   */
  addSafeListener(acceptBtn, "click", async () => {
    if (!currentCallData) {
      console.warn('[teleVetVetDashboard] ⚠ No call data to accept');
      return;
    }

    try {
      console.log('[teleVetVetDashboard] 👍 Accepting call:', currentCallData.callId);
      
      // Hide notification
      if (incomingBox) incomingBox.style.display = "none";

      // POST to accept endpoint
      const response = await fetch(`/televet/call/accept/${currentCallData.callId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        console.log('[teleVetVetDashboard] ✓ Call accepted. Redirecting to room:', result.roomId);
        
        // Redirect to call room where WebRTC will begin
        window.location.href = `/televet/room/${result.roomId}`;
      } else {
        console.error('[teleVetVetDashboard] ✗ Accept failed:', result.message);
        alert('Failed to accept call: ' + result.message);
      }
    } catch (error) {
      console.error('[teleVetVetDashboard] ✗ Accept error:', error);
      alert('Error accepting call');
    }
  });

  /**
   * Reject Call Button
   * POST to /televet/call/reject/:callId
   */
  addSafeListener(rejectBtn, "click", async () => {
    if (!currentCallData) {
      console.warn('[teleVetVetDashboard] ⚠ No call data to reject');
      return;
    }

    try {
      console.log('[teleVetVetDashboard] 👎 Rejecting call:', currentCallData.callId);
      
      // Hide notification
      if (incomingBox) incomingBox.style.display = "none";
      const callIdToReject = currentCallData.callId;
      currentCallData = null;

      // POST to reject endpoint
      const response = await fetch(`/televet/call/reject/${callIdToReject}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        console.log('[teleVetVetDashboard] ✓ Call rejected');
        // Show brief confirmation
        if (incomingText) incomingText.innerText = 'Call rejected';
        setTimeout(() => {
          if (incomingBox) incomingBox.style.display = "none";
        }, 2000);
      } else {
        console.error('[teleVetVetDashboard] ✗ Reject failed:', result.message);
      }
    } catch (error) {
      console.error('[teleVetVetDashboard] ✗ Reject error:', error);
    }
  });

  // Log initial state
  console.log('[teleVetVetDashboard] ✓ Initialized:', {
    vetId,
    vetName,
    socketId: socket.id,
    socketConnected: socket.connected,
    hasIncomingBox: !!incomingBox,
    hasAcceptBtn: !!acceptBtn,
    hasRejectBtn: !!rejectBtn
  });
})();
