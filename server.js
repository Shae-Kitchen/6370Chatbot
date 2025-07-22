// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";

// Load .env variables
dotenv.config();

const app = express();
const PORT = 5500;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors()); // Allow frontend to talk to backend
app.use(express.json()); // Parse JSON request bodies

// Serve static files from the "Public" folder
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "Public")));

// Chat route
app.post("/api/chat", async (req, res) => {
  // Destructure personalization data from request body
  const {
    message: userMessage,
    userName = "friend",
    conversationGoal = "companionship",
  } = req.body;

  if (!userMessage || typeof userMessage !== "string") {
    return res.status(400).json({ error: "Invalid message format" });
  }

  // Helper function to generate system prompt based on goal
  function getSystemPrompt(userName, conversationGoal) {
    switch (conversationGoal) {
      case "tutoring":
        return `You are a patient and knowledgeable tutor helping ${userName} learn new concepts clearly and thoroughly.`;
      case "coaching":
        return `You are an encouraging and insightful coach supporting ${userName} in personal growth and motivation.`;
      case "companionship":
      default:
        return `You are a warm and friendly companion chatting with ${userName}, offering empathy and light-hearted conversation.`;
    }
  }

  const systemPrompt = getSystemPrompt(userName, conversationGoal);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 256,
    });

    res.json({ reply: response.choices[0].message.content.trim() });
  } catch (error) {
    console.error("OpenAI Error:", error);
    const status = error.status || 500;
    const message = error.message || "Something went wrong";
    res.status(status).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

function getSystemPrompt(userName, conversationGoal) {
  switch (conversationGoal) {
    case "tutoring":
      return `You are a patient and knowledgeable tutor helping ${userName} learn new concepts clearly and thoroughly.`;
    case "coaching":
      return `You are an encouraging and insightful coach supporting ${userName} in personal growth and motivation.`;
    case "companionship":
    default:
      return `You are a warm and friendly companion chatting with ${userName}, offering empathy and light-hearted conversation.`;
  }
}
