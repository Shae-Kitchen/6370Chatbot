// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";

// Load .env variables
dotenv.config();

const app = express();
const PORT = 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors()); // Allow frontend to talk to backend
app.use(express.json()); // Parse JSON request bodies

// Chat route
app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage || typeof userMessage !== "string") {
    return res.status(400).json({ error: "Invalid message format" });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant for a chic but ADHD entrepreneur. Provide all facts before assessments, and don't sugarcoat answers.",
        },
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
