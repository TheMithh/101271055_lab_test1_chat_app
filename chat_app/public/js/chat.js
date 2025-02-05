const socket = io();

// Get username & room
let username = localStorage.getItem("username") || "Anonymous";
let room = localStorage.getItem("room") || "defaultRoom";

socket.emit("joinRoom", room);
console.log(`🏠 Joined room: ${room}`);

// ✅ Load previous messages
socket.on("previousMessages", (messages) => {
    console.log("📥 Loading previous messages:", messages);
    
    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML = ""; // Clear previous messages from old rooms

    messages.forEach(msg => {
        const messageElement = document.createElement("p");
        messageElement.innerHTML = `<b>${msg.from_user}:</b> ${msg.message}`;
        chatBox.appendChild(messageElement);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
});


document.getElementById("logoutBtn").addEventListener("click", () => {
    console.log("🚪 Logging out...");
    
    // ✅ Remove stored user session data
    localStorage.removeItem("username");
    localStorage.removeItem("room");

    // ✅ Redirect back to login page
    window.location.href = "/login.html";
});

// ✅ Function to send messages
document.getElementById("sendBtn").addEventListener("click", () => {
    const messageInput = document.getElementById("message");
    const message = messageInput.value.trim();

    if (message) {
        console.log("📤 Sending message:", message);
        socket.emit("sendMessage", { from_user: username, room, message });
        messageInput.value = "";
    }
});

// ✅ Function to receive messages
socket.on("receiveMessage", (msg) => {
    console.log("📥 Received message:", msg);
    const chatBox = document.getElementById("chat-box");
    const messageElement = document.createElement("p");
    messageElement.innerHTML = `<b>${msg.from_user}:</b> ${msg.message}`;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
});

// ✅ Handle changing rooms
document.getElementById("roomSelect").addEventListener("change", () => {
    const newRoom = document.getElementById("roomSelect").value;
    console.log(`🔄 Changing to room: ${newRoom}`);

    socket.emit("leaveRoom", room);
    socket.emit("joinRoom", newRoom);

    localStorage.setItem("room", newRoom);
    room = newRoom;

    // ✅ Clear chat box immediately when switching rooms
    document.getElementById("chat-box").innerHTML = "";
});

