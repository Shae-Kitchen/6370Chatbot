import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";

dotenv.config();

const app = express();
const port = 5500;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // ✅ Correct
// serve frontend from public/

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant for a chic business woman. When asked a question, you provide all of the available facts before making an assessment and you don't sugarcoat the answers.",
        },
        { role: "user", content: userMessage },
      ],
      max_tokens: 256,
    });

    res.json({ reply: response.choices[0].message.content.trim() });
  } catch (error) {
    console.error("OpenAI API error:", error);

    if (error.code === "insufficient_quota" || error.status === 429) {
      res
        .status(429)
        .json({ error: "Quota exceeded. Please check your OpenAI billing." });
    } else {
      res.status(500).json({ error: "Something went wrong" });
    }
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
