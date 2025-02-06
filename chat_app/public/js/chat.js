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

  const msgContainer = document.createElement("div");
  msgContainer.classList.add("chat-message", "text-start");

  // Create a timestamp
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  msgContainer.innerHTML = `
      <div class='d-flex flex-column'>
          <b class='text-primary' style='text-align: left;'>${fromUser}</b>
          <span class='text-muted small' style='text-align: left;'>${timestamp}</span>
          <div class='mt-1 p-2 bg-light rounded' style='text-align: left;'>${text}</div>
      </div>
  `;

  chatBox.appendChild(msgContainer);
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


let lastTypingMessage = "";

socket.on("userTypingRoom", (usersTyping) => {
  let newTypingMessage = "";

  if (usersTyping.length === 1) {
    newTypingMessage = `${usersTyping[0]} is typing...`;
  } else if (usersTyping.length > 1) {
    newTypingMessage = `${usersTyping[0]} and ${usersTyping[1]} are typing...`;
  }


  if (newTypingMessage !== lastTypingMessage) {
    typingIndicator.textContent = newTypingMessage;
    lastTypingMessage = newTypingMessage;
  }
});



document.getElementById("roomSelect").addEventListener("change", () => {
  const newRoom = document.getElementById("roomSelect").value;
  socket.emit("leaveRoom", room);
  socket.emit("joinRoom", newRoom);
  localStorage.setItem("room", newRoom);
  room = newRoom;
  document.getElementById("chat-box").innerHTML = "";
});

document.getElementById("leaveRoomBtn").addEventListener("click", () => {
  socket.emit("leaveRoom", room);
  window.location.href = "/home.html";
});


document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("username");
  localStorage.removeItem("room");
  window.location.href = "/login.html";
});
