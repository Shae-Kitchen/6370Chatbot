document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#chat-box"); // Or wrap in a <form>
  form.addEventListener("submit", handleSubmit);

  const button = document.getElementById("chat-submit");
  button.addEventListener("click", handleSubmit);
});

async function handleSubmit(e) {
  e.preventDefault(); // Stop page reload
  await sendChat();
}

async function sendChat() {
  const chatInput = document.getElementById("chatbox-input");
  const chatQuery = chatInput.value.trim();

  if (!chatQuery) return; // Ignore empty messages

  appendMessage("user", chatQuery);
  chatInput.value = ""; // Clear input early

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: chatQuery }),
    });
    const data = await response.json();
    appendMessage("bot", data.reply);
  } catch (error) {
    console.error("Chat error:", error);
    appendMessage("bot", "⚠️ Failed to get a response.");
  }
}

function appendMessage(sender, message) {
  const chatBox = document.getElementById("chat-messages");
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}`;
  messageDiv.textContent = message;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll
}
