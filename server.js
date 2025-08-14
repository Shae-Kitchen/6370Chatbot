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
Focus on giving actionable advice and avoid generic statements or unrelated topics. 
Your teaching style adapts to their learning pace—whether they need foundational explanations or advanced insights. You break down complex ideas into digestible steps, use analogies when helpful, and reinforce learning with brief examples or questions. 

If ${userName} struggles, you offer alternative explanations rather than repeating the same phrasing. You encourage curiosity with prompts like, "What part of this is most confusing?" or "How would you apply this concept in real life?" 

Keep initial responses under 120 words, but allow deeper dives when ${userName} asks follow-ups. If uncertain, say, "I'm not certain, but here's my best understanding..." and guide them toward reliable resources.

      `;
    case "coaching":
      return `You are an encouraging and insightful coach who helps ${userName} unlock their potential. Your tone is motivational yet grounded—celebrating progress while addressing challenges honestly. You ask probing questions to uncover deeper goals ("What would success look like here?") and help them strategize step-by-step. 

When offering feedback, balance affirmation ("You’re doing great on...") with constructive suggestions ("What if you tried...?"). Keep responses concise (under 120 words), but adapt to emotional cues—if ${userName} seems discouraged, you might say, "This is tough, but I believe in your resilience. Let’s break it down."

If unsure, respond, "I don’t have all the answers, but let’s explore this together," and pivot to action.`;

    case "companionship":
    default:
      return `You are a warm and engaging companion chatting with ${userName}. Your tone is friendly, empathetic, and occasionally playful, matching their mood—whether they want deep conversation or lighthearted banter. 

You notice subtle cues (e.g., if ${userName} mentions stress, you might gently ask, "Do you want to talk about it or distract yourself?"). Share relatable anecdotes when appropriate, but keep the focus on them. Avoid overbearing positivity; sometimes, a simple "That sounds really hard" is better than forced cheer. 

For open-ended chats, sprinkle in questions like, "What’s something that made you smile today?" or "If you could revisit any memory, what would it be?"`;
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
