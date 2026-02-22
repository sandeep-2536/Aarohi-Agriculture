const express = require("express");
const path = require("path");
const app = express();
require("dotenv").config();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const i18n = require("i18n"); // Included from the second block for i18n
const port = process.env.PORT || 3000;
const { initializeCronJobs } = require('./config/cronJobs');
const cookieParser = require("cookie-parser");
const session = require("express-session");
const connectDB = require("./config/db");

// ✨ Connect to MongoDB
connectDB();

// --- Initialize Cron Jobs ---
initializeCronJobs();

// --- Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(cookieParser());

app.use(session({
    secret: "aarohi-secret",
    resave: false,
    saveUninitialized: true
}));

// --- Internationalization (i18n) Configuration ---
i18n.configure({
    locales: ["en", "hi", "kn"],
    directory: __dirname + "/locales",
    cookie: "aarohi_lang",
    defaultLocale: "en",
    autoReload: true,
    updateFiles: false
});
app.use(i18n.init); // Initialize i18n

// Expose logged-in user (from session) to all views as `user`
app.use((req, res, next) => {
    res.locals.user = req.session && req.session.user ? req.session.user : null;
    next();
});

// Expose user language preference and translation function to all views
app.use((req, res, next) => {
    res.locals.__ = res.__; // Translation function
    res.locals.userLang = req.cookies?.aarohi_lang || "en";
    res.locals.lang = res.locals.userLang; // Alias for templates
    next();
});

// --- Routes Imports ---
const aiRoutes = require('./routes/aiRoutes');
const authRoutes = require("./routes/authRoutes");
const schemeRoutes = require('./routes/schemeRoutes');
const farmerRoutes = require('./routes/farmerRoutes');
const communityRoutes = require("./routes/communityRoutes");
const chatRoutes = require("./routes/chatRoutes");
const communityProblemRoutes = require("./routes/communityProblemRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const animalRoutes = require('./routes/animalRoutes');
const cropRoutes = require('./routes/cropRoutes');
const vetAuthRoutes = require("./routes/vetAuthRoutes");
const callRoutes = require('./routes/callRoutes');
const dealerAuthRoutes = require('./routes/dealerAuthRoutes');
const stockRoutes = require('./routes/stockRoutes');
const i18nRoutes = require('./routes/i18nRoutes');
const adminRoutes = require('./routes/admin'); // Imported from first block
const weatherroutes = require('./routes/weatherRoutes');
const teleVetroutes=require('./routes/teleVetRoutes');

// --- Route Definitions ---

// Home route FIRST
app.get('/', (req, res) => {
    res.render('home/home');
});

app.use("/auth", authRoutes);
app.use("/ai", aiRoutes);
app.use('/i18n', i18nRoutes); // For changing language
app.use("/schemes", schemeRoutes);
app.use('/farmer', farmerRoutes);
app.use("/community", communityRoutes);
app.use("/community/chat", chatRoutes);
app.use("/community/problems", communityProblemRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/animals", animalRoutes);
app.use("/crops", cropRoutes);
app.use("/vet-auth", vetAuthRoutes);
app.use("/call", callRoutes);
app.use("/dealer-auth", dealerAuthRoutes);
app.use("/stock", stockRoutes);
app.use('/admin', adminRoutes);
app.use('/weather',weatherroutes);
app.use('/teleVet',teleVetroutes);

// Debug endpoint to inspect active user -> socket mappings (temporary)
const userSocketMap = {}; // { userId: socketId }

app.get('/debug/sockets', (req, res) => {
    try {
        res.json(userSocketMap);
    } catch (e) {
        res.status(500).json({ error: 'Failed to read socket map' });
    }
});


// --- Socket.IO Handlers ---

// Initialize teleVet routes with socket.io instance and user socket map
teleVetroutes.setSocketIO(io, userSocketMap);

// Store active rooms and their participants (shared across all connections)
const televetRooms = {}; // { roomId: [ { socketId, userId, userName, userRole }, ... ] }

io.on("connection", (socket) => {

    // Register a logged-in user with their socket id
    // Called from: farmer call page, vet dashboard, chat rooms, etc.
    socket.on('register', (userId) => {
        try {
            if (userId) {
                userSocketMap[userId] = socket.id;
                console.log('[socket] ✓ registered user', userId, '-> socket:', socket.id);
                // Acknowledge successful registration
                socket.emit('register-ack', { userId, socketId: socket.id });
            }
        } catch (e) {
            console.warn('[socket] register error', e);
            socket.emit('register-error', { message: 'Failed to register' });
        }
    });

    // Video-call related socket handlers removed

    // Clean up mapping when socket disconnects
    socket.on('disconnect', () => {
        try {
            for (const [userId, sId] of Object.entries(userSocketMap)) {
                if (sId === socket.id) {
                    delete userSocketMap[userId];
                    console.log('[socket] disconnected, removed mapping for user', userId);
                }
            }
        } catch (e) {
            console.warn('[socket] disconnect cleanup error', e);
        }
    });

    // Chat message handlers
    const Message = require('./models/Message'); // Assumes path to model
    // const User = require('./models/User'); // User model is not used directly here, but needed for population

    socket.on('joinRoom', async ({ roomId }) => {
        try {
            socket.join(roomId);
            console.log('[socket] joined chat room', roomId);
        } catch (e) {
            console.warn('[socket] joinRoom error', e);
        }
    });

    socket.on('sendMessage', async (payload) => {
        try {
            console.log('[socket] sendMessage received', { roomId: payload.roomId, text: payload.text });
            
            // Create and save message to DB
            const savedMsg = await Message.create({
                roomId: payload.roomId,
                user: payload.user._id,
                text: payload.text,
                image: payload.image || null,
                createdAt: new Date()
            });

            // Populate user data
            const populatedMsg = await Message.findById(savedMsg._id).populate('user');

            // Broadcast to all users in the room
            io.to(payload.roomId).emit('receiveMessage', {
                _id: populatedMsg._id,
                roomId: populatedMsg.roomId,
                user: {
                    _id: populatedMsg.user._id,
                    name: populatedMsg.user.name,
                    profileImage: populatedMsg.user.profileImage
                },
                text: populatedMsg.text,
                image: populatedMsg.image,
                createdAt: populatedMsg.createdAt
            });

            console.log('[socket] message saved and broadcasted');
        } catch (e) {
            console.error('[socket] sendMessage error', e);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    socket.on('deleteMessage', async (msgId) => {
        try {
            await Message.findByIdAndDelete(msgId);
            io.emit('messageDeleted', msgId);
            console.log('[socket] message deleted', msgId);
        } catch (e) {
            console.error('[socket] deleteMessage error', e);
        }
    });

    socket.on('updateMessage', async (payload) => {
        try {
            // Note: The original code used msgId._id which looked like a typo. Assuming payload._id contains the message ID.
            const updated = await Message.findByIdAndUpdate(payload._id, {
                text: payload.text,
                edited: true
            }, { new: true }).populate('user');

            io.emit('messageUpdated', {
                _id: updated._id,
                user: {
                    _id: updated.user._id,
                    name: updated.user.name,
                    profileImage: updated.user.profileImage
                },
                text: updated.text,
                edited: updated.edited,
                createdAt: updated.createdAt
            });

            console.log('[socket] message updated', payload._id);
        } catch (e) {
            console.error('[socket] updateMessage error', e);
        }
    });
    const VideoCall = require('./models/VideoCall');
    const User = require('./models/User');
    const Vet = require('./models/Vet');

    // Store active rooms and their participants
    // moved outside of connection handler so it persists across sockets
    

// Join TeleVet room
socket.on('televet-join-room', async ({ roomId, userId, userName, userRole }) => {
    try {
        console.log(`[TeleVet] ✓ ${userName} (${userRole}) joining room: ${roomId}`);
        
        socket.join(roomId);
        
        // Initialize room if doesn't exist
        if (!televetRooms[roomId]) {
            televetRooms[roomId] = [];
        }
        
        // Add socket to room
        televetRooms[roomId].push({
            socketId: socket.id,
            userId,
            userName,
            userRole
        });
        
        const participantCount = televetRooms[roomId].length;
        console.log(`[TeleVet] Room ${roomId} now has ${participantCount} participant(s)`);
        
        // Confirm to joining user that room is ready
        socket.emit('televet-room-ready', { 
            roomId, 
            participants: participantCount,
            message: `You joined. Waiting for ${participantCount === 1 ? 'other participant' : 'participants'}...`
        });
        
        // Notify others in room that user joined
        socket.to(roomId).emit('televet-user-joined', {
            userId,
            userName,
            userRole,
            participantCount
        });
        
        // CRITICAL: Update call status to active if BOTH parties present
        if (participantCount === 2) {
            await VideoCall.findOneAndUpdate(
                { roomId, status: { $in: ['pending', 'accepted'] } },
                { status: 'active', startTime: new Date() }
            );
            console.log(`[TeleVet] ✓ Call ${roomId} now ACTIVE (both parties connected)`);
            
            // Notify BOTH parties that call is active and they can start WebRTC
            io.to(roomId).emit('televet-both-ready', { 
                message: 'Both participants connected. Starting video...',
                timestamp: new Date()
            });
        }
    } catch (error) {
        console.error('[TeleVet] ✗ Error joining room:', error);
        socket.emit('televet-error', { message: 'Failed to join room', error: error.message });
    }
});

// WebRTC Offer
socket.on('televet-offer', ({ roomId, offer }) => {
    try {
        console.log(`[TeleVet] ⬆️  Offer relayed in room: ${roomId}`);
        socket.to(roomId).emit('televet-offer', { offer });
    } catch (error) {
        console.error('[TeleVet] ✗ Error relaying offer:', error);
    }
});

// WebRTC Answer
socket.on('televet-answer', ({ roomId, answer }) => {
    try {
        console.log(`[TeleVet] ⬇️  Answer relayed in room: ${roomId}`);
        socket.to(roomId).emit('televet-answer', { answer });
    } catch (error) {
        console.error('[TeleVet] ✗ Error relaying answer:', error);
    }
});

// ICE Candidate
socket.on('televet-ice-candidate', ({ roomId, candidate }) => {
    try {
        socket.to(roomId).emit('televet-ice-candidate', { candidate });
    } catch (error) {
        console.error('[TeleVet] ✗ Error relaying ICE candidate:', error);
    }
});

// Leave room
socket.on('televet-leave-room', async (roomId) => {
    try {
        console.log(`[TeleVet] User leaving room: ${roomId}`);
        
        socket.leave(roomId);
        socket.to(roomId).emit('televet-user-left', {
            message: 'Other participant left the call'
        });
        
        // Remove from room tracking
        if (televetRooms[roomId]) {
            televetRooms[roomId] = televetRooms[roomId].filter(
                p => p.socketId !== socket.id
            );
            
            // Clean up empty rooms
            if (televetRooms[roomId].length === 0) {
                delete televetRooms[roomId];
                
                // Update call status to ended if it was active
                const result = await VideoCall.findOneAndUpdate(
                    { roomId, status: 'active' },
                    { 
                        status: 'ended',
                        endTime: new Date()
                    }
                );
                if (result) {
                    console.log(`[TeleVet] ✓ Call ${roomId} ended (no participants)`);
                }
            }
        }
    } catch (error) {
        console.error('[TeleVet] ✗ Error leaving room:', error);
    }
});

// Notify vet of incoming call (called from route after call creation)
// This function should be exported and called from your route
async function notifyVetOfIncomingCall(io, vetId, callData) {
    try {
        // Find vet's socket
        const vetSocketId = userSocketMap[vetId.toString()];
        
        if (vetSocketId) {
            io.to(vetSocketId).emit('new-call-for-vet', {
                callId: callData._id,
                roomId: callData.roomId,
                farmerId: callData.farmerId._id,
                farmerName: callData.farmerId.name,
                farmerImage: callData.farmerId.profileImage,
                farmerLocation: `${callData.farmerId.village}, ${callData.farmerId.state}`,
                timestamp: callData.createdAt
            });
            console.log(`[TeleVet] Notified vet ${vetId} of incoming call`);
        } else {
            console.log(`[TeleVet] Vet ${vetId} not connected to socket`);
        }
    } catch (error) {
        console.error('[TeleVet] Error notifying vet:', error);
    }
}

// Handle disconnect - clean up TeleVet rooms
socket.on('disconnect', () => {
    // ... existing disconnect code ...
    
    // Clean up TeleVet rooms
    for (const [roomId, participants] of Object.entries(televetRooms)) {
        const updatedParticipants = participants.filter(p => p.socketId !== socket.id);
        
        if (updatedParticipants.length !== participants.length) {
            televetRooms[roomId] = updatedParticipants;
            
            // Notify others in room
            io.to(roomId).emit('televet-user-left');
            
            // Clean up empty rooms
            if (televetRooms[roomId].length === 0) {
                delete televetRooms[roomId];
                console.log(`[TeleVet] Room ${roomId} closed due to disconnect`);
            }
        }
    }
});

// Export the notification function for use in routes
module.exports = { notifyVetOfIncomingCall };

});

// --- Server Startup ---

// Add error handler so EADDRINUSE is reported cleanly on Windows
http.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
        console.error(`🚫 Port ${port} is already in use. Choose a different PORT in your .env or stop the process using the port.`);
        console.error('To find and stop the process on Windows (PowerShell):');
        console.error('  netstat -ano | findstr :<PORT>');
        console.error('  taskkill /PID <PID> /F');
        process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
});

http.listen(port, () => {
    console.log("🚀 Socket.IO + Server running on", port);
});