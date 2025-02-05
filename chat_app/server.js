const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const GroupMessage = require("./models/GroupMessage");  // ✅ Fix: Import GroupMessage model
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ✅ Debugging: Ensure .env variables are loading
console.log("🔍 MongoDB URI:", process.env.MONGO_URI);
const PORT = process.env.PORT || 5000;
console.log(`🌍 Server running on port: ${PORT}`);

// Middleware
app.use(express.json());
app.use(cors());

// ✅ Serve Static Files
app.use(express.static(path.join(__dirname, "public"))); // Serves CSS & JS
app.use(express.static(path.join(__dirname, "views")));  // Serves HTML files

// Serve Login Page as Default
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "login.html"));
});

// ✅ MongoDB Connection with Improved Debugging
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB Atlas Connected"))
.catch(err => {
    console.error("❌ MongoDB Connection Failed. Check your MONGO_URI in .env", err);
    process.exit(1);
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// ✅ Real-Time Chat with Socket.io
io.on("connection", (socket) => {
    console.log("🔗 New user connected");

    socket.on("joinRoom", async (room) => {
        socket.join(room);
        console.log(`📌 User joined room: ${room}`);

        try {
            // ✅ Fetch previous messages from MongoDB
            const messages = await GroupMessage.find({ room }).sort({ date_sent: 1 });
            socket.emit("previousMessages", messages);
            console.log(`📥 Sent ${messages.length} previous messages to user`);
        } catch (err) {
            console.error("❌ Error fetching previous messages:", err);
        }
    });

    socket.on("sendMessage", async ({ from_user, room, message }) => {
        console.log(`📤 Storing message from ${from_user} in ${room}`);

        // ✅ Store the message in MongoDB
        const newMessage = new GroupMessage({ from_user, room, message });
        await newMessage.save();

        io.to(room).emit("receiveMessage", { from_user, message, timestamp: new Date() });
    });

    socket.on("leaveRoom", (room) => {
        socket.leave(room);
        console.log(`🚪 User left room: ${room}`);
    });

    socket.on("disconnect", () => {
        console.log("❌ User disconnected");
    });
});


// ✅ Start Server
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
