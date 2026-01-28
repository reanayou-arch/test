import express from "express";
import fetch from "node-fetch";
import path from "path";

const app = express();
app.use(express.json());

// ✅ Раздаём фронт
app.use(express.static("public"));

// ✅ API Proxy для Groq
app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GROQ_API_KEY не задан в Environment Variables"
      });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Render использует PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Horror-Studio запущен на порту", PORT);
});
