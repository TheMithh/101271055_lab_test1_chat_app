// File: server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

// Models
const GroupMessage = require("./models/GroupMessage");
const PrivateMessage = require("./models/PrivateMessage");

// Routes
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");

// Create Express & Socket
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ENV Setup
const PORT = process.env.PORT || 5000;
console.log("Starting server on port:", PORT);

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files (HTML/CSS/JS)
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "views")));

// Default route -> login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// REST routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Track which socket belongs to which username
const activeUsers = {}; // { username: socketId }

io.on("connection", (socket) => {
  console.log("New socket connected:", socket.id);

  // "registerUser" tells the server the user's username
  socket.on("registerUser", (username) => {
    activeUsers[username] = socket.id;
    console.log(`Registered ${username} -> ${socket.id}`);
  });

  // Join a public room
  socket.on("joinRoom", async (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
    try {
      // Fetch backlog
      const messages = await GroupMessage.find({ room }).sort({ date_sent: 1 });
      // Send only to this user
      socket.emit("previousMessages", messages);
    } catch (err) {
      console.error("Error fetching room messages:", err);
    }
  });

  // Leave a public room
  socket.on("leaveRoom", (room) => {
    socket.leave(room);
    console.log(`Socket ${socket.id} left room: ${room}`);
  });

  // Send a group message
  socket.on("sendMessage", async ({ from_user, room, message }) => {
    console.log(`Group message from ${from_user} in ${room}: ${message}`);

    // Save to DB
    const newMsg = new GroupMessage({ from_user, room, message });
    await newMsg.save();

    // Broadcast to everyone in room
    io.to(room).emit("receiveMessage", {
      from_user,
      message,
      timestamp: new Date()
    });
  });

  // Private messages
  socket.on("privateMessage", async ({ from_user, to_user, message }) => {
    console.log(`Private from ${from_user} to ${to_user}: ${message}`);

    // Save in DB
    const newPM = new PrivateMessage({ from_user, to_user, message });
    await newPM.save();

    // Send to recipient
    const recipientSocketId = activeUsers[to_user];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receivePrivateMessage", {
        from_user,
        to_user,
        message,
        timestamp: new Date()
      });
    }

    // Also echo back to sender, so they see it in real time
    const senderSocketId = activeUsers[from_user];
    if (senderSocketId) {
      io.to(senderSocketId).emit("receivePrivateMessage", {
        from_user,
        to_user,
        message,
        timestamp: new Date()
      });
    }
  });

  // Typing indicator for group chat
 // Handle private chat typing indicator
socket.on("typingPrivate", ({ from_user, to_user }) => {
  const recipientSocketId = activeUsers[to_user];
  if (recipientSocketId) {
    io.to(recipientSocketId).emit("userTypingPrivate", from_user);
  }
});

const typingUsers = {}; // { room: Set(["user1", "user2"]) }

// Handle typing indicator for public rooms
socket.on("typingRoom", ({ username, room }) => {
  if (!typingUsers[room]) {
    typingUsers[room] = new Set();
  }

  // Add user to typing list
  typingUsers[room].add(username);

  // Limit to max 2 users shown typing
  if (typingUsers[room].size > 2) {
    const usersArray = Array.from(typingUsers[room]);
    typingUsers[room] = new Set(usersArray.slice(-2)); // Keep last 2 users
  }

  // Broadcast updated typing list to the room
  io.to(room).emit("userTypingRoom", Array.from(typingUsers[room]));

  // Remove user after 2 seconds of inactivity
  setTimeout(() => {
    typingUsers[room].delete(username);
    io.to(room).emit("userTypingRoom", Array.from(typingUsers[room]));
  }, 2000);
});


  // Disconnect
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    // Find which user had this socket, remove if you want
    for (const [uname, sId] of Object.entries(activeUsers)) {
      if (sId === socket.id) {
        delete activeUsers[uname];
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
