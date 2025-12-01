// incomingCall.js — include on every page via footer
(function () {
window.socket = window.socket || io();
const socket = window.socket;

socket.on("connect", () => {
    if (window.CURRENT_USER && !socket._registeredOnce) {
        socket.emit("register", window.CURRENT_USER._id);
        socket._registeredOnce = true;
        console.log("[socket] registered", window.CURRENT_USER._id);
    }
});
// your pages set this on render for logged-in users

// Elements (guard for pages that may not include the modal)
const modal = (typeof document !== 'undefined') ? document.getElementById("incomingCallModal") : null;
const incomingFrom = modal ? modal.querySelector('#incomingFrom') : null;
const acceptBtn = modal ? modal.querySelector('#acceptCallBtn') : null;
const rejectBtn = modal ? modal.querySelector('#rejectCallBtn') : null;
const timerEl = modal ? modal.querySelector('#callTimer') : null;

// Register on connect if we have a logged in user
socket.on("connect", () => {
  try {
    if (CURRENT_USER && !socket._registeredOnce) {
      socket.emit("register", CURRENT_USER._id);
      socket._registeredOnce = true;
      console.log('[incomingCall] registered socket for user', CURRENT_USER && CURRENT_USER._id);
    }
  } catch (e) {
    console.warn('[incomingCall] registration failed', e);
  }
});

// Listen for incomingCall and handle it. If modal is not present, fall back to console/alert.
let callMeta = null;
let sec = 0;
let timerInterval = null;

socket.on('incomingCall', (meta) => {
  console.log('[incomingCall] incomingCall event received', meta);
  const { fromUserId, fromName, roomId } = meta || {};
  callMeta = { fromUserId, fromName, roomId };

  if (modal && incomingFrom && timerEl) {
    incomingFrom.textContent = `${fromName} is calling...`;
    modal.style.display = 'block';

    try {
      const audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.play().catch(()=>{});
      modal._audio = audio;
    } catch (e) {}

    sec = 0;
    timerEl.textContent = 'Ringing...';
    timerInterval = setInterval(() => {
      sec++;
      timerEl.textContent = `Ringing: ${sec}s`;
      if (sec >= 30) {
        hideModal();
        socket.emit('rejectCall', { callerUserId: callMeta.fromUserId });
      }
    }, 1000);
  } else {
    // No modal available on this page — show a simple alert as fallback
    try {
      if (confirm(`${fromName || 'Someone'} is calling. Join?`)) {
        // Accept: notify server and navigate to room
        socket.emit('acceptCall', { callerUserId: fromUserId, roomId });
        window.location.href = `/call/room/${roomId}`;
      } else {
        socket.emit('rejectCall', { callerUserId: fromUserId });
      }
    } catch (e) {
      console.log('[incomingCall] fallback prompt failed', e);
    }
  }
});

if (modal && acceptBtn) {
  acceptBtn.addEventListener('click', () => {
    if (!callMeta) return;
    hideModal();
    socket.emit('acceptCall', { callerUserId: callMeta.fromUserId, roomId: callMeta.roomId });
    setTimeout(() => {
      window.location.href = `/call/room/${callMeta.roomId}`;
    }, 300);
  });
}

if (modal && rejectBtn) {
  rejectBtn.addEventListener('click', () => {
    if (!callMeta) return;
    hideModal();
    socket.emit('rejectCall', { callerUserId: callMeta.fromUserId });
  });
}

  // Caller notifications
  socket.on('callAccepted', ({ roomId }) => {
    console.log('[incomingCall] callAccepted -> redirecting to room', roomId);
    if (roomId) window.location.href = `/call/room/${roomId}`;
  });

  socket.on("callRejected", ({ fromUserId }) => {
    alert("Call was rejected.");
    // Optionally stop any "waiting" UI for caller
  });

  socket.on("callResponse", (data) => {
    // offline/busy responses etc.
    if (data.status === "offline") {
      alert("User seems offline.");
    }
  });

  socket.on("callCancelled", ({ fromUserId }) => {
    // callee got cancelled
    hideModal();
    alert("Call cancelled by caller.");
  });

  function hideModal() {
    if (modal) modal.style.display = "none";
    callMeta = null;
    if (modal && modal._audio && typeof modal._audio.pause === "function") modal._audio.pause();
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      if (timerEl) timerEl.textContent = "";
    }
  }
})();
