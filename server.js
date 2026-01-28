import express from "express";
import fetch from "node-fetch";
import path from "path";

const app = express();
app.use(express.json());

/* ✅ Раздаём папку public */
app.use(express.static("public"));

/* ✅ Главная страница = меню */
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

/* ✅ Панель автора */
app.get("/author", (req, res) => {
  res.sendFile(path.resolve("public/author.html"));
});

/* ✅ Игра (чат) */
app.get("/play", (req, res) => {
  res.sendFile(path.resolve("public/play.html"));
});

/* ✅ Проверка ключа */
app.get("/testkey", (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.send("❌ GROQ_API_KEY НЕ найден");
  }
  res.send("✅ GROQ_API_KEY подключён");
});

/* ✅ Chat API */
app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: {
          message: "Нет GROQ_API_KEY в Render Environment Variables"
        }
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify(req.body)
      }
    );

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({
      error: {
        message: err.message
      }
    });
  }
});

/* ✅ Render порт */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Horror-Studio работает на порту", PORT);
});
