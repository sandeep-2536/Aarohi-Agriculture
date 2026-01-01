// public/js/teleVetFarmerCall.js
(function () {
  const socket = io();

  // Read config from DOM
  const cfgEl = document.getElementById('teleVetConfig');
  const cfg = cfgEl ? cfgEl.dataset : {};
  const farmerId = cfg.farmerId || '';
  const farmerName = cfg.farmerName || '';
  const vetId = cfg.vetId || '';
  const vetName = cfg.vetName || '';

  const localVideo = document.getElementById("localVideo");
  const remoteVideo = document.getElementById("remoteVideo");
  const endCallBtn = document.getElementById("endCallBtn");
  const muteBtn = document.getElementById("muteBtn");
  const cameraBtn = document.getElementById("cameraBtn");
  const statusEl = document.getElementById("callStatus");

  let roomId = "vetroom_" + Date.now() + "_" + Math.floor(Math.random() * 9999);
  let localStream = null;
  let pc = null;
  let isMuted = false;
  let cameraOff = false;
  let isConnected = false;

  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ]
  };

  console.log('[teleVetFarmerCall] initialized:', { farmerId, vetId, roomId, farmerName, vetName });

  // Wait for socket to connect, then register farmer
  if (socket.connected) {
    socket.emit("register", farmerId);
    console.log('[teleVetFarmerCall] registered farmer:', farmerId);
  } else {
    socket.on('connect', () => {
      socket.emit("register", farmerId);
      console.log('[teleVetFarmerCall] registered farmer after connect:', farmerId);
    });
  }

  function createPeerConnection() {
    console.log('[teleVetFarmerCall] creating peer connection');
    pc = new RTCPeerConnection(rtcConfig);

    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
        console.log('[teleVetFarmerCall] added track:', track.kind);
      });
    }

    pc.ontrack = (event) => {
      console.log('[teleVetFarmerCall] ontrack event:', event.streams.length);
      if (event.streams && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
        statusEl.innerText = "Connected ✓";
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("iceCandidate", { roomId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[teleVetFarmerCall] connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        statusEl.innerText = 'Connection lost...';
      }
    };
  }

  async function start() {
    try {
      console.log('[teleVetFarmerCall] requesting media');
      localStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: true 
      });
      localVideo.srcObject = localStream;
      console.log('[teleVetFarmerCall] media obtained');

      createPeerConnection();

      // Call vet
      socket.emit("callUser", {
        toUserId: vetId,
        roomId,
        fromUserId: farmerId,
        fromName: farmerName,
        type: 'teleVet'
      });

      statusEl.innerText = "Calling doctor...";
      console.log('[teleVetFarmerCall] call initiated');
    } catch (err) {
      console.error('[teleVetFarmerCall] error:', err);
      statusEl.innerText = "Camera/mic permission denied";
      alert("Please allow camera and microphone access and reload the page.");
    }
  }

  socket.on("callAccepted", ({ roomId: acceptedRoom }) => {
    console.log('[teleVetFarmerCall] call accepted');
    statusEl.innerText = "Doctor accepted. Connecting video...";
    socket.emit("joinRoom", roomId);
  });

  socket.on("callRejected", () => {
    console.log('[teleVetFarmerCall] call rejected');
    statusEl.innerText = "Doctor rejected the call.";
  });

  socket.on("noAnswer", () => {
    console.log('[teleVetFarmerCall] doctor offline');
    statusEl.innerText = "Doctor is not available.";
  });

  socket.on("ready", async () => {
    console.log('[teleVetFarmerCall] doctor ready, creating offer');
    if (!pc) {
      await new Promise(r => setTimeout(r, 500));
    }
    try {
      const offer = await pc.createOffer({ 
        offerToReceiveVideo: true, 
        offerToReceiveAudio: true 
      });
      await pc.setLocalDescription(offer);
      socket.emit("offer", { roomId, offer });
      console.log('[teleVetFarmerCall] offer sent');
    } catch (err) {
      console.error('[teleVetFarmerCall] offer error:', err);
    }
  });

  socket.on("answer", async (answer) => {
    console.log('[teleVetFarmerCall] answer received');
    try {
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('[teleVetFarmerCall] answer set');
    } catch (err) {
      console.error('[teleVetFarmerCall] answer error:', err);
    }
  });

  socket.on("iceCandidate", async ({ candidate }) => {
    try {
      if (candidate && pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error('[teleVetFarmerCall] ICE error:', err);
    }
  });

  socket.on("callEnded", () => {
    console.log('[teleVetFarmerCall] call ended by doctor');
    statusEl.innerText = "Doctor ended the call.";
    cleanup();
  });

  endCallBtn.addEventListener("click", () => {
    console.log('[teleVetFarmerCall] farmer ending call');
    socket.emit("endCall", { roomId, userId: farmerId });
    statusEl.innerText = "Call ended.";
    cleanup();
  });

  muteBtn.addEventListener("click", () => {
    isMuted = !isMuted;
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
    }
    muteBtn.innerText = isMuted ? "Unmute" : "Mute";
  });

  cameraBtn.addEventListener("click", () => {
    cameraOff = !cameraOff;
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !cameraOff);
    }
    cameraBtn.innerText = cameraOff ? "Camera On" : "Camera Off";
  });

  function cleanup() {
    if (pc) {
      pc.close();
      pc = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    setTimeout(() => {
      window.location.href = "/teleVet";
    }, 1500);
  }

  start();
})();