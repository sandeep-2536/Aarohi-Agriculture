# TeleVet Socket.IO + WebRTC Integration Guide

## 🔍 CORRECTED CALL FLOW

```
Farmer (Browser)                Server                       Vet (Browser)
   |                              |                             |
   +--POST /televet/call/initiate--->|                          |
   |  (creates VideoCall DB record)|                          |
   |                              +--emit 'new-call-for-vet'--->|
   |                              |                             |
   |  Listen for 'call-accepted'  |  (waiting for vet)        Receives notification
   |  (socket event)              |                             |
   |                              |                             +--Click "Accept"
   |                              |                             |
   |                              |<--POST /televet/call/accept-|
   |                              |  (updates DB status)        |
   |                              +--emit 'call-accepted'------>|
   |  <--Redirect to /televet/room/:roomId--                    |
   |                              |                          Redirect to room
   |                              |                             |
   +--emit 'televet-join-room'--->|                             |
   |                              |<---emit 'televet-join-room-|
   |                              |                             |
   |  Create PeerConnection       +--emit 'televet-both-ready'->|
   |  Send WebRTC Offer           |<--televet-both-ready-------+|
   |                                                             |
   +----------------WebRTC Signaling (offer/answer/ICE)------->+
   |  <--WebRTC video/audio streams established-->            |
   |                                                             |
```

## 📍 DEPLOYMENT CHECKLIST

### ✅ 1. Updated Files

**Backend:**
- [x] [app.js](app.js#L115) - Added `register-ack` socket response
- [x] [routes/teleVetRoutes.js](routes/teleVetRoutes.js#L92) - Enhanced logging on call initiate/accept/reject
- [x] [views/teleVet/call-room.ejs](views/teleVet/call-room.ejs) - Created unified call room view

**Frontend:**
- [x] [public/js/teleVetVetDashboard.js](public/js/teleVetVetDashboard.js) - Fixed to listen for `new-call-for-vet`
- [x] [public/js/teleVetInitiateCall.js](public/js/teleVetInitiateCall.js) - NEW: Handles farmer call initiation
- [x] [public/js/teleVetCallRoom.js](public/js/teleVetCallRoom.js) - NEW: Unified WebRTC for both parties
- [x] [views/teleVet/farmerCall.ejs](views/teleVet/farmerCall.ejs) - Updated to load `teleVetInitiateCall.js`

### ✅ 2. Socket Events Flow

**Registration Event:**
```javascript
// FROM: Any page that needs to receive calls
socket.emit("register", userId);  // userId = farmer._id or vet._id

// Server responds with:
socket.on('register-ack', ({ userId, socketId }) => { ... });
```

**Call Initiation:**
```javascript
// FROM: WebServer when farmer clicks "Call Doctor"
POST /televet/call/initiate/:vetId
// Server emits:
io.to(vetSocketId).emit('new-call-for-vet', {
  callId, roomId, farmerName, farmerLocation, ...
});
```

**Vet Dashboard Listen:**
```javascript
// LISTEN on: Vet dashboard page
socket.on('new-call-for-vet', (callData) => {
  // Show incoming call popup
  // When vet clicks "Accept":
  POST /televet/call/accept/:callId
  // Redirect to /televet/room/:roomId
});
```

**Call Room (both parties):**
```javascript
// LISTEN on: /televet/room/:roomId
socket.emit('televet-join-room', { roomId, userId, userName, userRole });

socket.on('televet-both-ready', () => {
  // Start media capture
  // Create peer connection
  // Send WebRTC offer/answer
});

socket.on('televet-offer', ({ offer }) => { ... });
socket.on('televet-answer', ({ answer }) => { ... });
socket.on('televet-ice-candidate', ({ candidate }) => { ... });
```

---

## 🧪 VERIFICATION & TESTING

### Test 1: Socket Registration
```bash
# Access debug endpoint
curl http://localhost:3000/debug/sockets

# Should show:
{ "vetId": "socket-id-xyz", "farmerId": "socket-id-abc" }
```

### Test 2: Vet Notification (Check Logs)
```
1. Open vet dashboard in one browser
2. Look for logs:
   [teleVetVetDashboard] ✓ Socket connected: abc123
   [teleVetVetDashboard] 📝 Registering vet: vetId -> abc123
   [teleVetVetDashboard] ✓ Registration ACK - server confirmed

3. Farmer initiates call in another browser
4. Server logs should show:
   [TeleVet] 📞 Call initiate request - farmerId: xyz vetId: abc
   [TeleVet] ✓ VideoCall created: roomId
   [TeleVet] ✓ VET NOTIFIED: abc received 'new-call-for-vet' event (socketId: socket-id)

5. Vet dashboard should show:
   [teleVetVetDashboard] ☎️ INCOMING CALL: { callId, roomId, farmerName }
```

### Test 3: Call Accept Flow
```
1. Vet clicks "Accept Call" button
2. Should see logs:
   [teleVetVetDashboard] 👍 Accepting call: callId
   POST /televet/call/accept/callId -> 200 OK

3. Server logs:
   [TeleVet] ✓ VET ACCEPTING call: callId
   [TeleVet] ✓ Call status updated to ACCEPTED. roomId: room-xxx
   [TeleVet] ✓ FARMER NOTIFIED: farmerId received 'call-accepted' event

4. Both should redirect to /televet/room/room-xxx
```

### Test 4: Room Join & WebRTC Start
```
1. Both parties in /televet/room/:roomId
2. Console logs should show:
   [teleVetCallRoom] ✓ Initialized: { roomId, userId, userRole, socketId }
   [teleVetCallRoom] 🚪 Joining room: room-xxx
   [teleVetCallRoom] ✓ Room ready: { participants: 1/2 }
   [teleVetCallRoom] ✓ Other participant joined: { otherName, participantCount: 2 }
   [teleVetCallRoom] 🎬 BOTH READY - Starting WebRTC

3. Farmer should emit offer:
   [teleVetCallRoom] 👨‍🌾 Farmer: Creating offer
   [teleVetCallRoom] ✓ Offer sent

4. Vet should emit answer:
   [teleVetCallRoom] ☝️ Offer received
   [teleVetCallRoom] 🩺 Vet: Waiting for offer...
   [teleVetCallRoom] ✓ Answer sent

5. Both should receive ICE candidates and establish connection:
   [teleVetCallRoom] ✓ ontrack: 1
   [teleVetCallRoom] ✓ Media Connection State: connected
```

---

## 🔧 TROUBLESHOOTING

### ❌ Vet Not Receiving Notification

**Symptom:** Farmer calls, but vet doesn't see incoming call popup

**Debug Steps:**
1. Check vet is registered:
   ```
   curl http://localhost:3000/debug/sockets
   # Should include vetId
   ```

2. Check server logs when farmer initiates:
   ```
   [TeleVet] ✓ VET NOTIFIED: vetId received 'new-call-for-vet'
   // vs
   [TeleVet] ⚠ Vet vetId NOT ONLINE (not in userSocketMap)
   ```

3. Check vet dashboard has correct event listener:
   ```javascript
   // Browser console - check script loaded
   console.log('[teleVetVetDashboard] listener active');
   
   // Should see listener registered
   socket.on("new-call-for-vet", ...)
   ```

4. Verify socket.io file is served:
   ```bash
   curl http://localhost:3000/socket.io/socket.io.js | head
   # Should not be 404
   ```

**Solution:**
- Ensure `veteridDashboard` script loads AFTER socket.io
- Check vet is actually logged in (`window.CURRENT_VET` should be set)
- Verify `register` event fires on page load

---

### ❌ WebRTC Not Connecting After Accept

**Symptom:** Both redirect to room, but no video/audio connection

**Debug Steps:**
1. Check both parties joined room:
   ```
   [teleVetCallRoom] 🚪 Joining room: room-xxx
   [teleVetCallRoom] ✓ Room ready: { participants: 1/2 }
   ```

2. Check `televet-both-ready` event fired:
   ```
   [teleVetCallRoom] 🎬 BOTH READY - Starting WebRTC
   ```

3. Check offer/answer exchange:
   ```
   [teleVetCallRoom] 👨‍🌾 Farmer: Creating offer
   [teleVetCallRoom] ☝️ Offer received
   [teleVetCallRoom] ✓ Answer sent
   ```

4. Check ICE candidates received:
   ```
   [teleVetCallRoom] ❄️ ICE candidate
   ```

**Solution:**
- Ensure media permissions granted (camera/mic)
- Check network allows WebRTC (not behind restrictive NAT)
- Verify STUN servers are reachable
- Check browser console for RTCError details

---

### ❌ Farmer Redirected to Room Before Vet Accepted

**Symptom:** Farmer sees WebRTC loading but vet still on dashboard

**Root Cause:** Farmer doesn't wait for `call-accepted` event

**Solution:** 
Confirmed fixed in `teleVetInitiateCall.js`:
```javascript
socket.on('call-accepted', ({ roomId }) => {
  window.location.href = `/televet/room/${roomId}`;
});
```

---

## 📊 LOGGING LEVELS

All scripts use prefixed console logs:

```javascript
[teleVetVetDashboard]     // Vet dashboard registration
[teleVetInitiateCall]     // Farmer call initiation
[teleVetCallRoom]         // Call room WebRTC
[TeleVet]                 // Server-side routes
[socket]                  // Server-side socket handlers
```

Filter logs in Chrome DevTools:
```
Filter: "teleVet"        // Show all TeleVet logs
Filter: "✓"              // Show success logs only
Filter: "✗"              // Show error logs only
Filter: "⚠"              // Show warnings only
```

---

## 🚀 QUICK START REFERENCE

### For Farmer:
1. Navigate to `/televet` (vet list)
2. Click a vet
3. Lands on `/televet/farmer/call/:vetId`
4. Page auto-initiates call via POST
5. Waits for `call-accepted` event
6. Redirects to `/televet/room/:roomId`
7. WebRTC starts when both are in room

### For Vet:
1. Navigate to `/televet/vet/dashboard`
2. Vet ID registered on socket
3. Receives `new-call-for-vet` when farmer calls
4. Sees incoming call popup
5. Clicks "Accept Call"
6. POST to `/televet/call/accept/:callId`
7. Server emits `call-accepted` to farmer
8. Vet redirected to `/televet/room/:roomId`
9. WebRTC starts when farmer joins

---

## 🔐 SECURITY NOTES

- VideoCall records created with both `farmerId` and `vetId` immediately
- All room endpoints verify user is part of the call before allowing access
- Socket.IO namespace not used (single socket per client) - consider adding namespaces for scaling
- No authentication token refresh during call - sessions can expire
- STUN servers are public Google endpoints - consider private STUN for production

---

## 📈 PERFORMANCE TIPS

- Use connection pooling for MongoDB if high call volume
- Consider Redis for userSocketMap if >1000 concurrent users
- Monitor socket memory leaks (rooms not being cleaned up)
- Implement call duration limits to prevent hung connections
- Add metrics/logging for troubleshooting call quality issues

---

## 🎯 NEXT STEPS (Optional Enhancements)

1. **Call Recording:** Stream media to server for recording
2. **Call History:** Track call duration, quality metrics
3. **Screen Sharing:** Add WebRTC data channel for screen share
4. **Bandwidth Management:** Implement adaptive bitrate control
5. **Mobile Optimization:** Test on mobile browsers (iOS Safari needs specific config)
6. **Load Balancing:** Use Socket.IO adapter for multi-server deployment
7. **Notifications:** Add browser push notifications for incoming calls
8. **Call Queueing:** Queue calls if vet is busy, notify when available
