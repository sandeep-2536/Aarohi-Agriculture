// public/js/teleVetDoctorCall.js
(function () {
  const socket = io();

  // Read config from DOM
  const cfgEl = document.getElementById('teleVetConfig');
  const cfg = cfgEl ? cfgEl.dataset : {};
  const vetId = cfg.vetId || '';
  const vetName = cfg.vetName || '';
  const roomId = cfg.roomId || '';
  const farmerId = cfg.farmerId || '';
  const farmerName = cfg.farmerName || '';

  const localVideo = document.getElementById("localVideo");
  const remoteVideo = document.getElementById("remoteVideo");
  const endCallBtn = document.getElementById("endCallBtn");
  const muteBtn = document.getElementById("muteBtn");
  const cameraBtn = document.getElementById("cameraBtn");
  const statusEl = document.getElementById("callStatus");

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

  console.log('[teleVetDoctorCall] initialized:', { vetId, farmerId, roomId, vetName, farmerName });

  // Wait for socket to connect, then register vet
  if (socket.connected) {
    socket.emit("register", vetId);
    console.log('[teleVetDoctorCall] registered vet:', vetId);
  } else {
    socket.on('connect', () => {
      socket.emit("register", vetId);
      console.log('[teleVetDoctorCall] registered vet after connect:', vetId);
    });
  }

  function createPeerConnection() {
    console.log('[teleVetDoctorCall] creating peer connection');
    pc = new RTCPeerConnection(rtcConfig);

    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
        console.log('[teleVetDoctorCall] added track:', track.kind);
      });
    }

    pc.ontrack = (event) => {
      console.log('[teleVetDoctorCall] ontrack event:', event.streams.length);
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
      console.log('[teleVetDoctorCall] connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        statusEl.innerText = 'Connection lost...';
      }
    };
  }

  async function start() {
    try {
      console.log('[teleVetDoctorCall] requesting media');
      localStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: true 
      });
      localVideo.srcObject = localStream;
      console.log('[teleVetDoctorCall] media obtained');

      createPeerConnection();

      // Join room and wait for farmer
      socket.emit("joinRoom", roomId);
      statusEl.innerText = "Waiting for video connection...";
    } catch (err) {
      console.error('[teleVetDoctorCall] error:', err);
      statusEl.innerText = "Camera/mic permission denied";
      alert("Please allow camera and microphone access and reload the page.");
    }
  }

  socket.on("ready", async () => {
    console.log('[teleVetDoctorCall] farmer ready, creating offer');
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
      console.log('[teleVetDoctorCall] offer sent');
    } catch (err) {
      console.error('[teleVetDoctorCall] offer error:', err);
    }
  });

  socket.on("answer", async (answer) => {
    console.log('[teleVetDoctorCall] answer received');
    try {
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('[teleVetDoctorCall] answer set');
    } catch (err) {
      console.error('[teleVetDoctorCall] answer error:', err);
    }
  });

  socket.on("iceCandidate", async ({ candidate }) => {
    try {
      if (candidate && pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error('[teleVetDoctorCall] ICE error:', err);
    }
  });

  socket.on("callEnded", () => {
    console.log('[teleVetDoctorCall] call ended by farmer');
    statusEl.innerText = "Farmer ended the call.";
    cleanup();
  });

  endCallBtn.addEventListener("click", () => {
    console.log('[teleVetDoctorCall] vet ending call');
    socket.emit("endCall", { roomId, userId: vetId });
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
      window.location.href = "/teleVet/doctor/dashboard";
    }, 1500);
  }

  start();
})();