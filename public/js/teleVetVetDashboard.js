// public/js/teleVetVetDashboard.js
(function () {
  const socket = io();
  const { vetId, vetName } = window.VET_DASH_CONFIG;

  const incomingBox = document.getElementById("incomingCallBox");
  const incomingText = document.getElementById("incomingText");
  const acceptBtn = document.getElementById("acceptBtn");
  const rejectBtn = document.getElementById("rejectBtn");

  socket.emit("register", vetId);

  let currentCallerId = null;
  let currentRoomId = null;

  socket.on("incomingCall", ({ fromUserId, fromName, roomId }) => {
    currentCallerId = fromUserId;
    currentRoomId = roomId;

    incomingText.innerText = `Incoming call from ${fromName || "Farmer"}`;
    incomingBox.style.display = "block";
  });

  acceptBtn.addEventListener("click", () => {
    if (!currentCallerId || !currentRoomId) return;

    socket.emit("acceptCall", {
      callerUserId: currentCallerId,
      roomId: currentRoomId
    });

    // go to doctor call page
    window.location.href = `/teleVet/doctor/call?roomId=${encodeURIComponent(currentRoomId)}&farmerId=${encodeURIComponent(currentCallerId)}`;
  });

  rejectBtn.addEventListener("click", () => {
    if (!currentCallerId) return;

    socket.emit("rejectCall", { callerUserId: currentCallerId });
    incomingBox.style.display = "none";
    currentCallerId = null;
    currentRoomId = null;
  });
})();
