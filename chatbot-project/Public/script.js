document.getElementById("chat-submit").addEventListener("click", sendChat);

async function sendChat() {
  const chatInput = document.getElementById("chatbox-input");
  const chatQuery = chatInput.value;

  appendMessage("user", chatQuery);

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: chatQuery }),
  });

  const data = await response.json();
  appendMessage("bot", data.reply);

  chatInput.value = "";
}

function appendMessage(sender, message) {
  const chatBox = document.getElementById("chat-messages");

  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message", sender);
  messageDiv.textContent = message;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}
