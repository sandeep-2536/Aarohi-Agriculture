// public/js/teleVetFarmerCall.js
(function () {
  const socket = io();

  // Read configuration rendered into the DOM by EJS (no inline script values)
  const cfgEl = document.getElementById('teleVetConfig');
  const cfg = cfgEl ? cfgEl.dataset : {};
  const role = cfg.role || 'farmer';
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

  console.log('[teleVetFarmerCall] initialized with config:', { role, farmerId, vetId, roomId, farmerName, vetName });

  if (farmerId) {
    socket.emit("register", farmerId);
  } else {
    console.warn('[teleVetFarmerCall] no farmerId found in DOM config');
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
      console.log('[teleVetFarmerCall] ontrack event received', event.streams);
      if (event.streams && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
        statusEl.innerText = "Connected ✓";
        isConnected = true;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[teleVetFarmerCall] sending ice candidate');
        socket.emit("iceCandidate", { roomId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[teleVetFarmerCall] connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        statusEl.innerText = 'Connection lost. Attempting to reconnect...';
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[teleVetFarmerCall] ice connection state:', pc.iceConnectionState);
    };
  }

  async function start() {
    try {
      console.log('[teleVetFarmerCall] requesting media devices');
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = localStream;
      console.log('[teleVetFarmerCall] local stream obtained');

      createPeerConnection();

      // tell server we want to call this vet
      socket.emit("callUser", {
        toUserId: vetId,
        roomId,
        fromUserId: farmerId,
        fromName: farmerName
      });

      statusEl.innerText = "Calling doctor...";
    } catch (err) {
      console.error('[teleVetFarmerCall] getUserMedia error', err);
      statusEl.innerText = "Camera/mic permission denied";
      alert("Camera/mic permission is required. Please allow access and reload.");
    }
  }

  // doctor accepted
  socket.on("callAccepted", ({ roomId: acceptedRoom }) => {
    console.log('[teleVetFarmerCall] doctor accepted, joining room:', acceptedRoom);
    if (acceptedRoom !== roomId) return;
    statusEl.innerText = "Doctor accepted. Connecting video...";
    socket.emit("joinRoom", roomId);
  });

  // doctor rejected
  socket.on("callRejected", () => {
    console.log('[teleVetFarmerCall] doctor rejected the call');
    statusEl.innerText = "Doctor rejected the call.";
  });

  // doctor unavailable
  socket.on("noAnswer", ({ toUserId }) => {
    console.log('[teleVetFarmerCall] doctor not available');
    if (toUserId === vetId) {
      statusEl.innerText = "Doctor is not available.";
    }
  });

  // When vet joins room, send offer to them
  socket.on("ready", async () => {
    console.log('[teleVetFarmerCall] doctor ready - creating offer');
    if (!pc) {
      console.log('[teleVetFarmerCall] peer connection not ready, waiting...');
      await new Promise(r => setTimeout(r, 100));
    }

    try {
      statusEl.innerText = "Setting up video connection...";
      const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      socket.emit("offer", { roomId, offer });
      console.log('[teleVetFarmerCall] offer sent');
    } catch (err) {
      console.error('[teleVetFarmerCall] offer creation failed', err);
    }
  });

  socket.on("answer", async (answer) => {
    console.log('[teleVetFarmerCall] received answer');
    try {
      if (!pc) {
        console.warn('[teleVetFarmerCall] peer connection not ready when receiving answer');
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('[teleVetFarmerCall] answer set successfully');
    } catch (err) {
      console.error('[teleVetFarmerCall] answer handling error', err);
    }
  });

  socket.on("iceCandidate", async ({ candidate }) => {
    try {
      if (candidate && pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error('[teleVetFarmerCall] Error adding ICE candidate', err);
    }
  });

  endCallBtn.addEventListener("click", () => {
    statusEl.innerText = "Call ended.";
    cleanupAndBack();
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

  function cleanupAndBack() {
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
    }, 1000);
  }

  // start everything
  start();
})();
