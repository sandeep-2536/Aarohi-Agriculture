// public/js/teleVetInitiateCall.js
// This script handles the INITIATION of the call from the farmer's side
// It runs on the farmerCall.ejs page and creates the VideoCall record

(function () {
  const socket = io();

  // Read config from DOM (set in farmerCall.ejs)
  const cfgEl = document.getElementById('teleVetConfig');
  const cfg = cfgEl ? cfgEl.dataset : {};
  const farmerId = cfg.farmerId || '';
  const farmerName = cfg.farmerName || '';
  const vetId = cfg.vetId || '';
  const vetName = cfg.vetName || '';

  const statusEl = document.getElementById("callStatus");
  const callButton = document.getElementById("callButton") || document.querySelector('[data-action="initiate-call"]');

  if (!farmerId || !vetId) {
    console.error('[teleVetInitiateCall] ✗ Missing farmerId or vetId');
    return;
  }

  console.log('[teleVetInitiateCall] ✓ Initialized:', { farmerId, vetId, vetName });

  // Register farmer with socket
  function registerFarmer() {
    try {
      if (!socket.connected) {
        console.warn('[teleVetInitiateCall] ⚠ socket not connected yet');
        return;
      }
      console.log('[teleVetInitiateCall] 📝 Registering farmer:', farmerId);
      socket.emit("register", farmerId);
    } catch (e) {
      console.error('[teleVetInitiateCall] ✗ register error:', e);
    }
  }

  socket.on('connect', () => {
    console.log('[teleVetInitiateCall] ✓ Socket connected:', socket.id);
    registerFarmer();
  });

  socket.on('register-ack', ({ userId, socketId }) => {
    console.log('[teleVetInitiateCall] ✓ Farmer registered:', { userId, socketId });
  });

  /**
   * Initiate call via HTTP endpoint
   * This creates a VideoCall record in DB and notifies the vet via socket
   */
  async function initiateCall() {
    try {
      if (statusEl) statusEl.innerText = "Calling doctor...";

      console.log('[teleVetInitiateCall] 📞 Posting to /televet/call/initiate/:vetId');

      const response = await fetch(`/televet/call/initiate/${vetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (!result.success) {
        console.error('[teleVetInitiateCall] ✗ Initiate failed:', result.message);
        if (statusEl) statusEl.innerText = `Error: ${result.message}`;
        return;
      }

      console.log('[teleVetInitiateCall] ✓ Call initiated. roomId:', result.roomId);
      if (statusEl) statusEl.innerText = "Waiting for doctor to accept...";

      // Store roomId and callId for later use
      window.TELEVET_CALL_DATA = {
        callId: result.callId,
        roomId: result.roomId,
        farmerId,
        farmerName,
        vetId,
        vetName
      };

      // Listen for vet's accept response
      const acceptListener = ({ roomId: acceptedRoomId, vetName: acceptedVetName }) => {
        if (acceptedRoomId === result.roomId) {
          console.log('[teleVetInitiateCall] ✓ Doctor accepted! Joining room...');
          socket.off('call-accepted', acceptListener);

          // Redirect to call room where both parties will join and WebRTC will start
          window.location.href = `/televet/room/${result.roomId}`;
        }
      };

      socket.on('call-accepted', acceptListener);

      // Timeout after 60 seconds
      setTimeout(() => {
        socket.off('call-accepted', acceptListener);
        console.log('[teleVetInitiateCall] ⚠ Call timeout - doctor did not accept');
        if (statusEl) statusEl.innerText = 'Doctor did not respond';
      }, 60000);

    } catch (error) {
      console.error('[teleVetInitiateCall] ✗ Error initiating call:', error);
      if (statusEl) statusEl.innerText = 'Error initiating call';
    }
  }

  // Bind call button if it exists
  if (callButton) {
    callButton.addEventListener('click', initiateCall);
  } else {
    // Auto-start call if no button (legacy behavior)
    console.log('[teleVetInitiateCall] ℹ No call button found, auto-initiating');
    initiateCall();
  }
})();
