// public/js/teleVetDoctorCall.js
(function () {
  const socket = io();

  // Read configuration rendered into the DOM by EJS (no inline script values)
  const cfgEl = document.getElementById('teleVetConfig');
  const cfg = cfgEl ? cfgEl.dataset : {};
  const role = cfg.role || 'vet';
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
voiceSpeak("Connecting to doctor, please wait");

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

  console.log('[teleVetDoctorCall] initialized with config:', { role, vetId, roomId, farmerId, farmerName });

  if (vetId) {
    socket.emit("register", vetId);
  } else {
    console.warn('[teleVetDoctorCall] no vetId found in DOM config');
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
      console.log('[teleVetDoctorCall] ontrack event received', event.streams);
      if (event.streams && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
        statusEl.innerText = "Connected ✓";
        isConnected = true;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[teleVetDoctorCall] sending ice candidate');
        socket.emit("iceCandidate", { roomId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[teleVetDoctorCall] connection state:', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        statusEl.innerText = 'Connection lost. Attempting to reconnect...';
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[teleVetDoctorCall] ice connection state:', pc.iceConnectionState);
    };
  }

  async function start() {
    try {
      console.log('[teleVetDoctorCall] requesting media devices');
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = localStream;
      console.log('[teleVetDoctorCall] local stream obtained');

      createPeerConnection();

      // join the room
      socket.emit("joinRoom", roomId);
      statusEl.innerText = "Connecting...";
    } catch (err) {
      console.error('[teleVetDoctorCall] getUserMedia error', err);
      statusEl.innerText = "Camera/mic permission denied";
      alert("Camera/mic permission is required. Please allow access and reload.");
    }
  }

  // When farmer joins and this vet is ready, create offer
  socket.on("ready", async () => {
    console.log('[teleVetDoctorCall] farmer ready - creating offer');
    if (!pc) {
      console.log('[teleVetDoctorCall] peer connection not ready, waiting...');
      await new Promise(r => setTimeout(r, 100));
    }
    try {
      const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      socket.emit("offer", { roomId, offer });
      console.log('[teleVetDoctorCall] offer sent');
    } catch (err) {
      console.error('[teleVetDoctorCall] offer creation failed', err);
    }
  });

  // Receive answer from farmer
  socket.on("answer", async (answer) => {
    console.log('[teleVetDoctorCall] received answer');
    try {
      if (!pc) {
        console.warn('[teleVetDoctorCall] peer connection not ready when receiving answer');
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('[teleVetDoctorCall] answer set successfully');
    } catch (err) {
      console.error('[teleVetDoctorCall] answer handling error', err);
    }
  });

  socket.on("iceCandidate", async ({ candidate }) => {
    try {
      if (candidate && pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error('[teleVetDoctorCall] Error adding ICE candidate', err);
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
      window.location.href = "/teleVet/doctor/dashboard";
    }, 1000);
  }

  start();
})();
