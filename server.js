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

    const stories = data.filter(f => f.name.endsWith(".json"));

    res.json(stories);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   ✅ СОХРАНЕНИЕ ИСТОРИИ В GITHUB
=========================== */
app.post("/api/save-story", async (req, res) => {
  try {
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    const branch = process.env.GITHUB_BRANCH || "main";
    const folder = process.env.STORIES_PATH || "stories";

    if (!repo || !token) {
      return res.status(500).json({
        error: "❌ Нет GITHUB_TOKEN или GITHUB_REPO"
      });
    }

    const story = req.body;

    if (!story.title) {
      return res.status(400).json({
        error: "❌ История без названия"
      });
    }

    const filename =
      story.title.toLowerCase().replace(/\s+/g, "_") + ".json";

    const filePath = `${folder}/${filename}`;

    const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;

    const contentBase64 = Buffer.from(
      JSON.stringify(story, null, 2)
    ).toString("base64");

    const uploadResponse = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      },
      body: JSON.stringify({
        message: `Добавлена история: ${story.title}`,
        content: contentBase64,
        branch: branch
      })
    });

    const result = await uploadResponse.json();

    if (!uploadResponse.ok) {
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
