// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import axios from "axios";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

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

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

app.use("/audio", express.static(path.join(__dirname, "audio")));

app.post("/api/tts", async (req, res) => {
  const { text } = req.body;

  if (!text) return res.status(400).json({ error: "Text is required" });

  const filename = `${uuidv4()}.mp3`;
  const filepath = path.join(__dirname, "audio", filename);

  try {
    const response = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      responseType: "stream",
      data: {
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
    });

    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      res.json({ audioUrl: `/audio/${filename}` });
    });

    writer.on("error", (err) => {
      console.error("Audio write error:", err);
      res.status(500).json({ error: "Failed to write audio file" });
    });
  } catch (err) {
    console.error("ElevenLabs Error:", err.message);
    res.status(500).json({ error: "Failed to generate speech" });
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

app.post("/api/unloader", async (req, res) => {
  const { text, includeTime = false } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Invalid input" });
  }

  // Build the system prompt for sorting
  let prompt = `Sort the following thoughts into four categories: "Do now", "Can wait", "Delegate", "Drop entirely".`;
  if (includeTime) {
    prompt += ` If possible, suggest a deadline or time estimate.`;
  }
  prompt += `\n\nThoughts:\n${text}\n\nReturn your answer as a JSON object with keys "do_now", "can_wait", "delegate", "drop_entirely". Each key should have an array of items. If you include time estimates, add them as a property for each item.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: prompt }
      ],
      max_tokens: 512,
      temperature: 0.3,
    });

    // Try to parse the response as JSON
    let result;
    try {
      result = JSON.parse(response.choices[0].message.content);
    } catch (err) {
      // If parsing fails, just send the raw text
      result = { raw: response.choices[0].message.content };
    }

    res.json(result);
  } catch (error) {
    console.error("OpenAI Decoder Error:", error);
    res.status(500).json({ error: "Failed to decode thoughts" });
  }
});