// public/js/teleVetCallRoom.js
// Unified WebRTC signaling for both farmer and vet in the call room
// This runs AFTER both parties have accepted and redirected to /televet/room/:roomId

(function () {
  const socket = io();

  // Read config from DOM
  const cfgEl = document.getElementById('teleVetConfig');
  const cfg = cfgEl ? cfgEl.dataset : {};
  const roomId = cfg.roomId || '';
  const userId = cfg.userId || '';
  const userName = cfg.userName || '';
  const userRole = cfg.userRole || ''; // 'farmer' or 'vet'
  const callId = cfg.callId || '';

  const localVideo = document.getElementById("localVideo");
  const remoteVideo = document.getElementById("remoteVideo");
  const endCallBtn = document.getElementById("endCallBtn");
  const muteBtn = document.getElementById("muteBtn");
  const cameraBtn = document.getElementById("cameraBtn");
  const statusEl = document.getElementById("callStatus");

  let localStream = null;
  let pc = null;
  let pendingIceCandidates = [];
  let isMuted = false;
  let cameraOff = false;
  let isConnected = false;
  let bothParticipantsReady = false;

  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" }
    ]
  };

  console.log('[teleVetCallRoom] ✓ Initialized:', {
    roomId,
    userId,
    userName,
    userRole,
    callId,
    socketId: socket.id
  });

  // ==================== SOCKET REGISTRATION ====================

  function registerUser() {
    try {
      if (!socket.connected) {
        console.warn('[teleVetCallRoom] ⚠ Socket not connected yet');
        return;
      }
      console.log('[teleVetCallRoom] 📝 Registering:', { userId, userRole });
      socket.emit("register", userId);
    } catch (e) {
      console.error('[teleVetCallRoom] ✗ register error:', e);
    }
  }

  socket.on('connect', () => {
    console.log('[teleVetCallRoom] ✓ Socket connected:', socket.id);
    registerUser();
  });

  // ==================== JOIN ROOM ====================

  /**
   * Emit televet-join-room to notify server both are in the same room
   */
  function joinRoom() {
    try {
      console.log('[teleVetCallRoom] 🚪 Joining room:', roomId);
      socket.emit('televet-join-room', {
        roomId,
        userId,
        userName,
        userRole
      });
    } catch (e) {
      console.error('[teleVetCallRoom] ✗ joinRoom error:', e);
    }
  }

  // Join room immediately
  joinRoom();

  // ==================== LISTEN FOR ROOM EVENTS ====================

  /**
   * Room is ready - user successfully joined
   */
  socket.on('televet-room-ready', ({ roomId: rId, participants, message }) => {
    console.log('[teleVetCallRoom] ✓ Room ready:', { participants, message });
    if (statusEl) statusEl.innerText = `Waiting for other participant... (${participants}/2)`;
  });

  /**
   * Other participant joined room
   */
  socket.on('televet-user-joined', ({ userId: otherId, userName: otherName, userRole: otherRole, participantCount }) => {
    console.log('[teleVetCallRoom] ✓ Other participant joined:', { otherName, otherRole, participantCount });
    if (statusEl) statusEl.innerText = `${otherName} joined. Starting video...`;
  });

  /**
   * BOTH participants are now in the room - start WebRTC
   */
  socket.on('televet-both-ready', ({ message, timestamp }) => {
    console.log('[teleVetCallRoom] 🎬 BOTH READY - Starting WebRTC:', message);
    bothParticipantsReady = true;
    
    if (statusEl) statusEl.innerText = "Starting video...";
    
    // Start media capture and peer connection
    startMediaAndPeerConnection();
  });

  /**
   * Other participant left the room
   */
  socket.on('televet-user-left', ({ message }) => {
    console.log('[teleVetCallRoom] ⚠ Other participant left:', message);
    if (statusEl) statusEl.innerText = 'Other participant left';
    cleanup();
  });

  /**
   * Error from server
   */
  socket.on('televet-error', ({ message, error }) => {
    console.error('[teleVetCallRoom] ✗ Room error:', message, error);
    if (statusEl) statusEl.innerText = 'Room error: ' + message;
  });

  // ==================== WEBRTC SIGNALING ====================

  function createPeerConnection() {
    console.log('[teleVetCallRoom] 🔌 Creating peer connection');
    pc = new RTCPeerConnection(rtcConfig);

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        console.log('[teleVetCallRoom] Adding track:', track.kind);
        pc.addTrack(track, localStream);
      });
    }

    // Listen for remote stream
    pc.ontrack = (event) => {
      console.log('[teleVetCallRoom] ✓ ontrack:', event.streams.length, 'streams');
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        console.log('[teleVetCallRoom] Remote stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
        console.log('[teleVetCallRoom] Setting remote video srcObject');
        remoteVideo.srcObject = stream;
        remoteVideo.play().catch(e => console.log('Play failed:', e)); // Ensure video plays
        isConnected = true;
        if (statusEl) statusEl.innerText = "Connected ✓";
      } else {
        console.log('[teleVetCallRoom] No streams in ontrack event');
      }
    };

    // Send ICE candidates to remote peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[teleVetCallRoom] ❄️  ICE candidate');
        socket.emit('televet-ice-candidate', {
          roomId,
          candidate: event.candidate
        });
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log('[teleVetCallRoom] 🔗 Connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        if (statusEl) statusEl.innerText = 'Connection lost...';
      }
    };

    return pc;
  }

  /**
   * Start media capture and create peer connection
   * One party creates offer, other creates answer
   */
  async function startMediaAndPeerConnection() {
    try {
      console.log('[teleVetCallRoom] 📹 Requesting media...');
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localVideo.srcObject = localStream;
      console.log('[teleVetCallRoom] ✓ Media obtained');
      console.log('[teleVetCallRoom] Local stream tracks:', localStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));

      createPeerConnection();

      // Farmer creates offer, vet answers
      if (userRole === 'farmer') {
        console.log('[teleVetCallRoom] 👨‍🌾 Farmer: Creating offer');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('televet-offer', { roomId, offer });
        console.log('[teleVetCallRoom] ✓ Offer sent');
      } else {
        // Vet waits for offer, will handle it in onmessage
        console.log('[teleVetCallRoom] 🩺 Vet: Waiting for offer...');
      }
    } catch (err) {
      console.error('[teleVetCallRoom] ✗ Media error:', err);
      if (statusEl) statusEl.innerText = "Camera/mic permission denied";
      alert("Please allow camera and microphone access");
    }
  }

  // ==================== WEBRTC OFFER/ANSWER HANDLING ====================

  /**
   * Receive offer from farmer (vet only)
   */
  socket.on('televet-offer', async ({ offer }) => {
    try {
      console.log('[teleVetCallRoom] ☝️  Offer received');
      if (!pc) {
        console.error('[teleVetCallRoom] ✗ PC not ready for offer');
        return;
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[teleVetCallRoom] ✓ Offer set as remote description');

      // Apply any queued ICE candidates now that remote description is set
      await drainPendingIceCandidates();

      // Vet creates answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('televet-answer', { roomId, answer });
      console.log('[teleVetCallRoom] ✓ Answer sent');
    } catch (err) {
      console.error('[teleVetCallRoom] ✗ Offer error:', err);
    }
  });

  /**
   * Receive answer from vet (farmer only)
   */
  socket.on('televet-answer', async ({ answer }) => {
    try {
      console.log('[teleVetCallRoom] ☝️  Answer received');
      if (!pc) {
        console.error('[teleVetCallRoom] ✗ PC not ready for answer');
        return;
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('[teleVetCallRoom] ✓ Answer set as remote description');

      // Apply any queued ICE candidates now that remote description is set
      await drainPendingIceCandidates();
    } catch (err) {
      console.error('[teleVetCallRoom] ✗ Answer error:', err);
    }
  });

  /**
   * Receive ICE candidate from remote peer
   */
  async function drainPendingIceCandidates() {
    if (!pc || !pendingIceCandidates.length) return;
    console.log('[teleVetCallRoom] 🧹 Adding pending ICE candidates:', pendingIceCandidates.length);
    const candidates = [...pendingIceCandidates];
    pendingIceCandidates = [];

    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[teleVetCallRoom] ✗ addIceCandidate (pending) error:', err);
      }
    }
  }

  socket.on('televet-ice-candidate', async ({ candidate }) => {
    try {
      if (!candidate || !pc) return;

      // If remote description isn't yet set, queue the candidate.
      if (!pc.remoteDescription || !pc.remoteDescription.type) {
        console.log('[teleVetCallRoom] ℹ Queueing ICE candidate (waiting for remote description)');
        pendingIceCandidates.push(candidate);
        return;
      }

      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('[teleVetCallRoom] ✗ ICE error:', err);
    }
  });

  // ==================== CALL CONTROL ====================

  /**
   * End call button
   */
  endCallBtn.addEventListener("click", async () => {
    console.log('[teleVetCallRoom] 🛑 Ending call');
    if (statusEl) statusEl.innerText = "Ending call...";
    
    try {
      // Notify server to end the call
      await fetch(`/televet/call/end/${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error('[teleVetCallRoom] ✗ Error posting end call:', e);
    }

    // Emit socket event to notify other party
    socket.emit('televet-leave-room', roomId);
    cleanup();
  });

  /**
   * Mute button
   */
  muteBtn.addEventListener("click", () => {
    isMuted = !isMuted;
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
    }
    muteBtn.innerText = isMuted ? "Unmute" : "Mute";
  });

  /**
   * Camera button
   */
  cameraBtn.addEventListener("click", () => {
    cameraOff = !cameraOff;
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !cameraOff);
    }
    cameraBtn.innerText = cameraOff ? "Camera On" : "Camera Off";
  });

  // ==================== CLEANUP ====================

  function cleanup() {
    console.log('[teleVetCallRoom] 🧹 Cleaning up');
    
    if (pc) {
      pc.close();
      pc = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach(t => {
        t.stop();
      });
      localStream = null;
    }

    // Clear pending ICE candidates so a new call starts fresh
    pendingIceCandidates = [];
    
    if (localVideo) localVideo.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;
    
    if (statusEl) statusEl.innerText = "Call ended";
    
    // Redirect after delay
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2000);
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    socket.emit('televet-leave-room', roomId);
    cleanup();
  });

})();
