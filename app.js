const express = require("express");
const path = require("path");
const app = express();
require("dotenv").config();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const port = process.env.PORT || 3000;

const session = require("express-session");
const connectDB = require("./config/db");

// ✨ Connect to MongoDB
connectDB();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
    secret: "aarohi-secret",
    resave: false,
    saveUninitialized: true
}));

// Expose logged-in user (from session) to all views as `user`
app.use((req, res, next) => {
    res.locals.user = req.session && req.session.user ? req.session.user : null;
    next();
});

// Routes
const aiRoutes = require('./routes/aiRoutes');
const authRoutes = require("./routes/authRoutes");
const schemeRoutes = require('./routes/schemeRoutes');
const farmerRoutes = require('./routes/farmerRoutes');
const communityRoutes = require("./routes/communityRoutes");
const chatRoutes = require("./routes/chatRoutes");
const communityProblemRoutes = require("./routes/communityProblemRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const callRoutes = require("./routes/callRoutes");
const animalRoutes = require('./routes/animalRoutes');
const cropRoutes = require('./routes/cropRoutes');
const vetAuthRoutes = require("./routes/vetAuthRoutes");
const teleVetRoutes = require("./routes/teleVetRoutes");
const dealerAuthRoutes = require('./routes/dealerAuthRoutes');
const stockRoutes = require('./routes/stockRoutes');

// Home route FIRST (to avoid conflict)
app.get('/', (req, res) => {
    res.render('home/home');
});



// Clean route structure
app.use("/auth", authRoutes);
app.use("/ai", aiRoutes);
app.use("/schemes", schemeRoutes);
app.use('/farmer', farmerRoutes);
app.use("/community", communityRoutes);
app.use("/community/chat", chatRoutes);
app.use("/community/problems", communityProblemRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/call", callRoutes);
app.use("/animals", animalRoutes);
app.use("/crops", cropRoutes);
app.use("/vet-auth", vetAuthRoutes);
app.use("/tele-vet", teleVetRoutes);
app.use('/dealer-auth', dealerAuthRoutes);
app.use('/stock', stockRoutes);


// Map users to sockets (top-level so it persists across connections)
const userSocketMap = {}; // { userId: socketId }

io.on("connection", (socket) => {

    // Register a logged-in user with their socket id
    socket.on('register', (userId) => {
        try {
            if (userId) {
                userSocketMap[userId] = socket.id;
                console.log('[socket] registered user', userId, '->', socket.id);
            }
        } catch (e) {
            console.warn('[socket] register error', e);
        }
    });

    // Caller requests to call a user by their userId
    socket.on('callUser', ({ toUserId, roomId, fromUserId, fromName }) => {
        console.log('[socket] callUser', { toUserId, roomId, fromUserId });
        const targetSocketId = userSocketMap[toUserId];
        if (targetSocketId) {
            io.to(targetSocketId).emit('incomingCall', { fromUserId, fromName, roomId });
        } else {
            // Inform caller there's no connected socket for the callee
            socket.emit('noAnswer', { toUserId });
        }
    });

    // Callee accepts the call — notify the caller
    socket.on('acceptCall', ({ callerUserId, roomId }) => {
        const callerSocketId = userSocketMap[callerUserId];
        console.log('[socket] acceptCall', { callerUserId, roomId, callerSocketId });
        if (callerSocketId) {
            io.to(callerSocketId).emit('callAccepted', { roomId });
        }
    });

    // Callee rejects the call
    socket.on('rejectCall', ({ callerUserId }) => {
        const callerSocketId = userSocketMap[callerUserId];
        if (callerSocketId) {
            io.to(callerSocketId).emit('callRejected', { by: socket.id });
        }
    });


    socket.on("joinRoom", (roomId) => {
        try {
            socket.join(roomId);
            const room = io.sockets.adapter.rooms.get(roomId);
            const members = room ? Array.from(room) : [];
            console.log('[socket] joinRoom', { roomId, socketId: socket.id, members });
            socket.to(roomId).emit("ready");
            console.log('[socket] ready emitted to room', roomId);
        } catch (e) {
            console.warn('[socket] joinRoom error', e);
        }
    });

    socket.on("offer", ({ roomId, offer }) => {
        console.log('[socket] forwarding offer to room', roomId);
        socket.to(roomId).emit("offer", offer);
    });

    socket.on("answer", ({ roomId, answer }) => {
        console.log('[socket] forwarding answer to room', roomId);
        socket.to(roomId).emit("answer", answer);
    });

    socket.on("iceCandidate", ({ roomId, candidate }) => {
        // candidate is an RTCIceCandidateInit-like object
        console.log('[socket] forwarding iceCandidate to room', roomId);
        socket.to(roomId).emit("iceCandidate", { candidate });
    });

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

});



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

