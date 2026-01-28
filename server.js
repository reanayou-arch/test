import express from "express";
import fetch from "node-fetch";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* ===========================
   Главная страница (меню)
=========================== */
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

/* ===========================
   Проверка ключа Groq
=========================== */
app.get("/testkey", (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.send("❌ GROQ_API_KEY НЕ найден");
  }
  res.send("✅ GROQ_API_KEY подключён");
});

/* ===========================
   Получить список историй из GitHub
=========================== */
app.get("/api/stories", async (req, res) => {
  try {
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const folder = process.env.STORIES_PATH || "stories";

    if (!repo) {
      return res.status(500).json({ error: "❌ GITHUB_REPO не задан" });
    }

    const url = `https://api.github.com/repos/${repo}/contents/${folder}?ref=${branch}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      }
    });

    if (!response.ok) {
      return res.status(404).json({
        error: `❌ Папка stories не найдена или GitHub API ошибка (${response.status})`
      });
    }

    const data = await response.json();

    // только JSON файлы
    const stories = data.filter(f => f.name.endsWith(".json"));

    res.json(stories);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   Chat API (Groq)
=========================== */
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

/* ===========================
   Render порт
=========================== */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("✅ Horror-Studio работает на порту", PORT);
});
