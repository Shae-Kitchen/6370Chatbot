import dotenv from "dotenv";
dotenv.config();

document.getElementById("chat-submit").addEventListener("click", sendChat);

async function sendChat() {
  const chatQuery = document.getElementById("chatbox-input").value;

  const answer = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: "CHATGPT_API",
    }, //end of headers section

    body: JSON.stringify({
      model: "gpt-4o-mini",
      store: true,
      messages: [
        { role: "system", content: "You are a helpful ai assistant" },
        { role: "user", content: chatQuery },
      ],
      max_tokens: 256,
    }),
  });
}
