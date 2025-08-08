
//***AI CHATBOT INTEGRATION***

// Wait until the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("chat-form");
  form.addEventListener("submit", handleSubmit);
});

// Handle form submission
async function handleSubmit(e) {
  e.preventDefault();
  await sendChat();
}

// Send the user message to the backend and get the AI response
async function sendChat() {
  const goalSelect = document.getElementById("conversation-goal");
  const conversationGoal = goalSelect ? goalSelect.value : "companionship";
  const userName = document.getElementById("user-name").value.trim();
  if (!userName) {
    appendMessage("bot", "⚠️ Please enter your name before chatting.");
    return;
  }
  const chatInput = document.getElementById("chatbox-input");
  const chatQuery = chatInput.value.trim();
  if (!chatQuery) return;

  appendMessage("user", chatQuery);
  chatInput.value = "";

  // Show "Thinking..." typing indicator
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "message bot typing-indicator";
  loadingDiv.textContent = "Thinking...";
  document.getElementById("chat-messages").appendChild(loadingDiv);

  try {
    // 🔥 MAKE SURE YOUR SERVER IS RUNNING ON THIS PORT
    const response = await fetch("http://localhost:5500/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: chatQuery,
        userName: userName,
        conversationGoal: conversationGoal,
      }),
    });

    const data = await response.json();
    removeTypingIndicator();

    if (data.error) {
      appendMessage("bot", `⚠️ Error: ${data.error}`);
    } else {
      simulateTyping(data.reply);
      speak(data.reply);
    }
  } catch (error) {
    removeTypingIndicator();
    appendMessage("bot", "⚠️ Failed to connect to the server.");
  }
}

// Append message to chat box
function appendMessage(sender, message) {
  const chatBox = document.getElementById("chat-messages");
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}`;
  messageDiv.textContent = message;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Simulate typing animation for bot reply
function simulateTyping(reply) {
  const chatBox = document.getElementById("chat-messages");
  const typingDiv = document.createElement("div");
  typingDiv.className = "message bot";
  chatBox.appendChild(typingDiv);

  let i = 0;
  const typingEffect = setInterval(() => {
    if (i < reply.length) {
      typingDiv.textContent = reply.substring(0, i + 1);
      i++;
      chatBox.scrollTop = chatBox.scrollHeight;
    } else {
      clearInterval(typingEffect);
    }
  }, 20);
}

// Remove any "Thinking..." indicators
function removeTypingIndicator() {
  const indicators = document.querySelectorAll(".typing-indicator");
  indicators.forEach((el) => el.remove());
}

async function speak(text) {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const data = await res.json();
  if (data.audioUrl) {
    const audio = new Audio(data.audioUrl);
    audio.play();
  } else {
    console.error("TTS error:", data.error);
  }
}

//** DECODER PROGRAM*/

