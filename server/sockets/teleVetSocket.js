// server/sockets/teleVetSocket.js
module.exports = (io) => {
	// Track active vet sessions
	const vetSessions = new Map(); // vetId -> { socketId, name, status }
	const callRooms = new Map(); // roomId -> { farmerId, vetId, status, startTime }
	const pendingCalls = new Map(); // vetId -> { farmerId, farmerName, roomId }

	// ============================================
	// TELEVET SPECIFIC EVENTS
	// ============================================

	// Farmer initiates video call to vet
	const handleTeleVetCallUser = (socket, io, userSocketMap) => {
		return ({ toUserId, roomId, fromUserId, fromName }) => {
			console.log('[teleVet] Farmer', fromName, 'calling vet', toUserId, 'roomId:', roomId);
      
			const targetSocketId = userSocketMap[toUserId];
      
			if (!targetSocketId) {
				console.log('[teleVet] Vet not online:', toUserId);
				socket.emit('noAnswer', { toUserId });
				return;
			}

			// Store pending call
			pendingCalls.set(toUserId, {
				farmerId: fromUserId,
				farmerName: fromName,
				roomId,
				timestamp: Date.now()
			});

			// Notify vet of incoming call
			io.to(targetSocketId).emit('incomingCall', {
				fromUserId,
				fromName,
				roomId,
				type: 'teleVet'
			});

			console.log('[teleVet] Incoming call notification sent to vet:', toUserId);
		};
	};

	// Vet accepts the call
	const handleTeleVetAcceptCall = (socket, io, userSocketMap) => {
		return ({ farmerId, roomId, vetId, vetName }) => {
			console.log('[teleVet] Vet', vetName, 'accepted call from farmer', farmerId);
      
			const farmerSocketId = userSocketMap[farmerId];
      
			if (!farmerSocketId) {
				console.log('[teleVet] Farmer disconnected:', farmerId);
				socket.emit('error', { message: 'Farmer is no longer online' });
				return;
			}

			// Store vet session
			vetSessions.set(vetId, {
				socketId: socket.id,
				name: vetName,
				status: 'in-call'
			});

			// Track call room
			callRooms.set(roomId, {
				farmerId,
				vetId,
				status: 'active',
				startTime: Date.now()
			});

			// Remove from pending
			pendingCalls.delete(vetId);

			// Notify farmer
			io.to(farmerSocketId).emit('callAccepted', { roomId });
      
			console.log('[teleVet] Call accepted, both parties notified');
		};
	};

	// Vet rejects the call
	const handleTeleVetRejectCall = (socket, io, userSocketMap) => {
		return ({ farmerId, vetId }) => {
			console.log('[teleVet] Vet', vetId, 'rejected call from farmer', farmerId);
      
			const farmerSocketId = userSocketMap[farmerId];
      
			pendingCalls.delete(vetId);
      
			if (farmerSocketId) {
				io.to(farmerSocketId).emit('callRejected', { vetId });
			}
		};
	};

	// End video call
	const handleTeleVetEndCall = (socket, io, userSocketMap) => {
		return ({ roomId, userId }) => {
			console.log('[teleVet] Call ended in room', roomId, 'by user', userId);
      
			const callData = callRooms.get(roomId);
      
			if (callData) {
				// Notify both parties
				io.to(roomId).emit('callEnded');
        
				// Clean up
				callRooms.delete(roomId);
				vetSessions.forEach((v, k) => {
					if (v.name === callData.vetId) {
						vetSessions.set(k, { ...v, status: 'available' });
					}
				});
			}
      
			socket.leave(roomId);
		};
	};

	return {
		handleTeleVetCallUser,
		handleTeleVetAcceptCall,
		handleTeleVetRejectCall,
		handleTeleVetEndCall,
		vetSessions,
		callRooms,
		pendingCalls
	};
};