const socket = io();

const username = localStorage.getItem("username") || "Anonymous";
const buddy = localStorage.getItem("privateBuddy") || "NoOne";

document.getElementById("buddyName").textContent = buddy;
socket.emit("registerUser", username);

// Load previous messages (no change)
async function loadPreviousPrivateMessages() {
  try {
    const res = await fetch(`/api/messages/private/${buddy}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentUser: username })
    });
    const messages = await res.json();
    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML = "";
    messages.forEach((msg) => {
      appendPrivateMessage(msg.from_user, msg.message);
    });
  } catch (error) {
    console.error("❌ Error loading private messages:", error);
  }
}

// Append messages to the chat box
function appendPrivateMessage(fromUser, text) {
  const chatBox = document.getElementById("chat-box");
  const p = document.createElement("p");
  p.innerHTML = `<b>${fromUser}:</b> ${text}`;
  chatBox.appendChild(p);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send private message
document.getElementById("sendBtn").addEventListener("click", () => {
  const messageInput = document.getElementById("message");
  const message = messageInput.value.trim();

  if (message) {
    socket.emit("privateMessage", { from_user: username, to_user: buddy, message });
    messageInput.value = "";
  }
});

// Listen for received private messages
socket.on("receivePrivateMessage", (pm) => {
  if (pm.from_user === buddy || pm.to_user === buddy) {
    appendPrivateMessage(pm.from_user, pm.message);
  }
});


const typingIndicator = document.getElementById("typing-indicator");
const messageInput = document.getElementById("message");
let typingTimeout;

// Send "typingPrivate" event when user types
messageInput.addEventListener("input", () => {
  socket.emit("typingPrivate", { from_user: username, to_user: buddy });

  // Clear previous timeout to remove indicator
  if (typingTimeout) clearTimeout(typingTimeout);

  // Remove typing message after 2 seconds of inactivity
  typingTimeout = setTimeout(() => {
    typingIndicator.textContent = "";
  }, 2000);
});


socket.on("userTypingPrivate", (typingUser) => {
  if (typingUser === buddy) {
    typingIndicator.textContent = `${typingUser} is typing...`;

    // Remove indicator after 2 seconds
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      typingIndicator.textContent = "";
    }, 2000);
  }
});

// Leave chat
document.getElementById("leavePrivateBtn").addEventListener("click", () => {
  window.location.href = "/home.html";
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("username");
  localStorage.removeItem("privateBuddy");
  window.location.href = "/login.html";
});

// Load chat history on page load
loadPreviousPrivateMessages();
