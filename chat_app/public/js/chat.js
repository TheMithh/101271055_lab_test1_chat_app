const socket = io();

let username = localStorage.getItem("username") || "Anonymous";
let room = localStorage.getItem("room") || "devops";

socket.emit("registerUser", username);
socket.emit("joinRoom", room);

// Listen for previous messages on room join
socket.on("previousMessages", (messages) => {
  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML = "";
  messages.forEach((msg) => {
    appendMessage(msg.from_user, msg.message);
  });
});

// Function to append a message
function appendMessage(fromUser, text) {
  const chatBox = document.getElementById("chat-box");
  const p = document.createElement("p");
  p.innerHTML = `<b>${fromUser}:</b> ${text}`;
  chatBox.appendChild(p);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send group message
document.getElementById("sendBtn").addEventListener("click", () => {
  const messageInput = document.getElementById("message");
  const message = messageInput.value.trim();
  if (message) {
    socket.emit("sendMessage", { from_user: username, room, message });
    messageInput.value = "";
  }
});

// Receive group message
socket.on("receiveMessage", (msg) => {
  appendMessage(msg.from_user, msg.message);
});

// 🟢 Typing Indicator for Room Chat
const typingIndicator = document.getElementById("typing-indicator");
const messageInput = document.getElementById("message");
let typingTimeout;

// Emit "typingRoom" when user types
messageInput.addEventListener("input", () => {
  socket.emit("typingRoom", { username, room });

  // Clear previous timeout
  if (typingTimeout) clearTimeout(typingTimeout);

  // Remove typing message after 2 seconds of inactivity
  typingTimeout = setTimeout(() => {
    typingIndicator.textContent = "";
  }, 2000);
});

// 🟢 Listen for typing indicator updates from server
socket.on("userTypingRoom", (usersTyping) => {
  if (usersTyping.length === 0) {
    typingIndicator.textContent = "";
  } else if (usersTyping.length === 1) {
    typingIndicator.textContent = `${usersTyping[0]} is typing...`;
  } else {
    typingIndicator.textContent = `${usersTyping[0]} and ${usersTyping[1]} are typing...`;
  }
});

// Switch rooms
document.getElementById("roomSelect").addEventListener("change", () => {
  const newRoom = document.getElementById("roomSelect").value;
  socket.emit("leaveRoom", room);
  socket.emit("joinRoom", newRoom);
  localStorage.setItem("room", newRoom);
  room = newRoom;
  document.getElementById("chat-box").innerHTML = "";
});

// Leave Room -> Go back to home
document.getElementById("leaveRoomBtn").addEventListener("click", () => {
  socket.emit("leaveRoom", room);
  window.location.href = "/home.html";
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("username");
  localStorage.removeItem("room");
  window.location.href = "/login.html";
});
