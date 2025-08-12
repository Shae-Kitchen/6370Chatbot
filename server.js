import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import axios from "axios";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

// Load .env variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 5500;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Middleware ---
app.use(cors()); // Allow frontend to talk to backend
app.use(express.json()); // Parse JSON request bodies
app.options("/api/chat", cors());
app.options("/api/tts", cors());
app.use("/audio", express.static(path.join(__dirname, "audio"))); // Serve audio files

// --- Helper function ---
function getSystemPrompt(userName, conversationGoal) {
  switch (conversationGoal) {
    case "tutoring":
      return `You are a patient and knowledgeable tutor helping ${userName}. You are a patient and knowledgeable tutor who explains 
      concepts step-by-step and encourages questions with the goal of helping ${userName} learn new concepts clearly and thoroughly.
Focus on giving actionable advice and avoid generic statements or unrelated topics. Limit initial answers to 120 words, and end your response with a question or point that furthers discussion.

"If you are unsure, say 'I'm not certain, but here's what I think.'"
      `;
    case "coaching":
      return `You are an encouraging and insightful coach supporting ${userName} in personal growth and motivation. Use 
      positive language to inspire and uplift ${userName}, while also providing constructive, practical feedback and guidance. Respond in short bursts, ideally not over 120 words.

      If you are unsure, respond with 'You know I'm not sure, but we can figure it out together' and ask a follow-up question.`;

    case "companionship":
    default:
      return `You are a warm and friendly companion chatting with ${userName}, offering empathy and light-hearted conversation.`;
  }
}

// Chatbot route
app.post("/api/chat", async (req, res) => {
  console.log("---- /api/chat ----");
  console.log("Headers:", req.headers);
  console.log("Raw req.body:", req.body);

  if (!req.body || typeof req.body !== "object") {
    console.log("ERROR: Request body missing or not JSON");
    return res.status(400).json({ error: "Request body missing or not JSON" });
  }

  const {
    message: userMessage,
    userName = "friend",
    conversationGoal = "companionship",
  } = req.body;

  console.log("Parsed userMessage:", userMessage);
  console.log("Parsed userName:", userName);
  console.log("Parsed conversationGoal:", conversationGoal);

  if (!userMessage || typeof userMessage !== "string") {
    console.log("ERROR: Invalid message format");
    return res.status(400).json({ error: "Invalid message format" });
  }

  const systemPrompt = getSystemPrompt(userName, conversationGoal);
  console.log("System prompt:", systemPrompt);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 256,
    });

    console.log("OpenAI response:", response.choices[0].message.content);
    res.json({ reply: response.choices[0].message.content.trim() });
  } catch (error) {
    console.error("OpenAI Error:", error);
    const status = error.status || 500;
    const message = error.message || "Something went wrong";
    res.status(status).json({ error: message });
  }
});

// Text-to-speech route
app.post("/api/tts", async (req, res) => {
  console.log("---- /api/tts ----");
  console.log("Raw req.body:", req.body);

  const { text } = req.body;
  console.log("Parsed text:", text);

  if (!text) {
    console.log("ERROR: Text is required");
    return res.status(400).json({ error: "Text is required" });
  }

  const filename = `${uuidv4()}.mp3`;
  const filepath = path.join(__dirname, "audio", filename);
  console.log("Audio filename:", filename);

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
      console.log("Audio file written:", filepath);
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

// Decoder (Unloader) route
app.post("/api/unloader", async (req, res) => {
  console.log("---- /api/unloader ----");
  console.log("Raw req.body:", req.body);

  const { input } = req.body;
  console.log("Parsed input:", input);

  if (!input || typeof input !== "string") {
    console.log("ERROR: Invalid input");
    return res.status(400).json({ error: "Invalid input" });
  }

  const prompt = `
Sort the following thoughts into four categories: "Do now", "Can wait", "Delegate", "Drop entirely".
For each item, if possible, suggest a deadline or time estimate.
Return your answer as a JSON object with keys "do_now", "can_wait", "delegate", "drop_entirely".
Each key should have an array of items. If you include time estimates, add them as a property for each item.

Thoughts:
${input}
`;
  console.log("System prompt:", prompt);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: prompt }],
      max_tokens: 512,
      temperature: 0.3,
    });

    console.log("OpenAI response:", response.choices[0].message.content);

    let result;
    try {
      result = JSON.parse(response.choices[0].message.content);
      console.log("Parsed result:", result);
    } catch (err) {
      result = { raw: response.choices[0].message.content };
      console.log("Raw result:", result);
    }

    res.json({ result });
  } catch (error) {
    console.error("OpenAI Unloader Error:", error);
    res.status(500).json({ error: "Failed to decode thoughts" });
  }
});

// Brain dump analyzer route
app.post("/api/analyze", async (req, res) => {
  console.log("---- /api/analyze ----");
  console.log("Raw req.body:", req.body);

  const { text } = req.body;
  console.log("Parsed text:", text);

  if (!text || typeof text !== "string") {
    console.log("ERROR: Invalid input");
    return res.status(400).json({ error: "Invalid input" });
  }

  const prompt = `
Analyze the following text. Extract and list:
- Keywords (important topics or concepts)
- Tasks (action items or things to do)
- Appointments (meetings, events, or scheduled activities)

Return your answer as a JSON object with keys "keywords", "tasks", and "appointments". Each key should have an array of items.

Text:
${text}
`;
  console.log("System prompt:", prompt);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: prompt }],
      max_tokens: 512,
      temperature: 0.3,
    });

    console.log("OpenAI response:", response.choices[0].message.content);

    let result;
    try {
      result = JSON.parse(response.choices[0].message.content);
      console.log("Parsed result:", result);
    } catch (err) {
      result = { raw: response.choices[0].message.content };
      console.log("Raw result:", result);
    }

    res.json(result);
  } catch (error) {
    console.error("OpenAI Analyze Error:", error);
    res.status(500).json({ error: "Failed to analyze brain dump" });
  }
});

// --- Static file serving ---

app.use(express.static(path.join(__dirname, "Public"))); // Serve static files from the "Public" folder

//--- Catch-all route for debugging ---
app.use((req, res) => {
  console.log("Catch-all route hit:", req.method, req.url);
  res.status(404).json({ error: "Not found" });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
