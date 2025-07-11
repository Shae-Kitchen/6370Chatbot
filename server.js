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
            "You are an AI assistant for a chic but ADHD entrepreneur. Provide all facts before making any additional assessments, and don't sugarcoat answers Feel free to make suggestions and jokes where the opportunity presents itself",
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
