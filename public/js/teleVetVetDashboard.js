// public/js/teleVetVetDashboard.js
(function () {
  const socket = io();

  // Diagnostic: show CURRENT_VET available at script start
  console.log('[teleVetVetDashboard] window.CURRENT_VET', window.CURRENT_VET);

  // Get vet ID from global window.CURRENT_VET (set in footer.ejs)
  const vetId = window.CURRENT_VET ? window.CURRENT_VET._id : null;
  const vetName = window.CURRENT_VET ? window.CURRENT_VET.name : 'Doctor';

  if (!vetId) {
    console.error('[teleVetVetDashboard] no vetId found - vet not logged in?');
    return;
  }

  // Support multiple possible modal element IDs (footer vs page)
  const incomingBox = document.getElementById("incomingCallBox") || document.getElementById('incomingCallModal');
  const incomingText = document.getElementById("incomingText") || document.getElementById('incomingFrom');
  const acceptBtn = document.getElementById("acceptBtn") || document.getElementById('acceptCallBtn');
  const rejectBtn = document.getElementById("rejectBtn") || document.getElementById('rejectCallBtn');

  // Register vet with socket once connected. Add retries and diagnostics.
  let registerAttempts = 0;
  const maxRegisterAttempts = 6;

  function registerVet() {
    try {
      registerAttempts++;
      console.log('[teleVetVetDashboard] attempting register', { vetId, attempt: registerAttempts, socketConnected: socket.connected, socketId: socket.id });
      socket.emit("register", vetId);
    } catch (e) {
      console.warn('[teleVetVetDashboard] register error', e);
    }
  }

  // On connect, immediately try to register
  socket.on('connect', () => {
    console.log('[teleVetVetDashboard] socket connected:', socket.id);
    registerVet();
  });

  // Also attempt registration periodically until we observe mapping on server (manual check) or max attempts
  const regInterval = setInterval(() => {
    if (registerAttempts >= maxRegisterAttempts) {
      clearInterval(regInterval);
      console.warn('[teleVetVetDashboard] max register attempts reached');
      return;
    }
    registerVet();
  }, 2000);

  let currentCallerId = null;
  let currentRoomId = null;

  socket.on("incomingCall", ({ fromUserId, fromName, roomId }) => {
    console.log('[teleVetVetDashboard] incomingCall received:', { fromUserId, fromName, roomId });
    currentCallerId = fromUserId;
    currentRoomId = roomId;

    if (incomingText) incomingText.innerText = `Incoming call from ${fromName || "Farmer"}`;
    if (incomingBox) incomingBox.style.display = "block";
  });

  function safeAddListener(el, event, fn) {
    if (!el) return;
    el.addEventListener(event, fn);
  }

  safeAddListener(acceptBtn, "click", () => {
    if (!currentCallerId || !currentRoomId) return;

    console.log('[teleVetVetDashboard] accept clicked:', { currentCallerId, currentRoomId });

    socket.emit("acceptCall", {
      callerUserId: currentCallerId,
      roomId: currentRoomId
    });

    // go to doctor call page with roomId and farmerId
    window.location.href = `/teleVet/doctor/call?roomId=${encodeURIComponent(currentRoomId)}&farmerId=${encodeURIComponent(currentCallerId)}`;
  });

  safeAddListener(rejectBtn, "click", () => {
    if (!currentCallerId) return;

    console.log('[teleVetVetDashboard] reject clicked:', { currentCallerId });
    socket.emit("rejectCall", { callerUserId: currentCallerId });
    if (incomingBox) incomingBox.style.display = "none";
    currentCallerId = null;
    currentRoomId = null;
  });
})();
