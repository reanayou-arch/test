import express from "express";
import fetch from "node-fetch";
import path from "path";

const app = express();
app.use(express.json());

/* ============================= */
/* ✅ Раздаём папку public */
/* ============================= */
app.use(express.static("public"));

/* ============================= */
/* ✅ Главная страница = меню */
/* ============================= */
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

/* ============================= */
/* ✅ Проверка ключа Groq */
/* ============================= */
app.get("/testkey", (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.send("❌ GROQ_API_KEY НЕ найден");
  }
  res.send("✅ GROQ_API_KEY подключён");
});

/* ============================= */
/* ✅ Chat API → Groq */
/* ============================= */
app.post("/api/chat", async (req, res) => {
  try {
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
    res.status(500).json({ error: err.message });
  }
});

/* ============================= */
/* ✅ СОХРАНЕНИЕ ИСТОРИИ В GITHUB */
/* ============================= */
app.post("/api/save-story", async (req, res) => {
  try {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const folder = process.env.STORIES_PATH || "stories";

    if (!token || !repo) {
      return res.status(500).json({
        error: "Нет GITHUB_TOKEN или GITHUB_REPO"
      });
    }

    const story = req.body;
    const filename = story.filename;

    if (!filename) {
      return res.status(400).json({
        error: "Нет filename"
      });
    }

    /* JSON → Base64 */
    const contentBase64 = Buffer.from(
      JSON.stringify(story.data, null, 2)
    ).toString("base64");

    /* GitHub API URL */
    const url = `https://api.github.com/repos/${repo}/contents/${folder}/${filename}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Добавлена новая история",
        content: contentBase64,
        branch: branch
      })
    });

    const result = await response.json();

    if (response.status >= 400) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      file: filename
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================= */
/* ✅ Render порт */
/* ============================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Horror-Studio работает на порту", PORT);
});
