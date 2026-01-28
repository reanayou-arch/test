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
   Проверка ключей
=========================== */
app.get("/debug", (req, res) => {
  res.json({
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
    GITHUB_TOKEN: !!process.env.GITHUB_TOKEN,
    GITHUB_REPO: process.env.GITHUB_REPO,
    STORIES_PATH: process.env.STORIES_PATH,
    GITHUB_BRANCH: process.env.GITHUB_BRANCH
  });
});

/* ===========================
   Получить список историй из GitHub
=========================== */
app.get("/api/stories", async (req, res) => {
  try {
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const folder = process.env.STORIES_PATH || "stories";
    const token = process.env.GITHUB_TOKEN;

    if (!repo) {
      return res.status(500).json({ error: "❌ GITHUB_REPO не задан" });
    }

    if (!token) {
      return res.status(500).json({ error: "❌ GITHUB_TOKEN отсутствует в Render" });
    }

    const url = `https://api.github.com/repos/${repo}/contents/${folder}?ref=${branch}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: `GitHub API ошибка`,
        status: response.status,
        details: data
      });
    }

    const stories = data.filter(f => f.name.endsWith(".json"));
    res.json(stories);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   Загрузить одну историю (для play.html)
=========================== */
app.get("/api/story/:name", async (req, res) => {
  try {
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const folder = process.env.STORIES_PATH || "stories";
    const token = process.env.GITHUB_TOKEN;

    const fileName = req.params.name;

    const url = `https://api.github.com/repos/${repo}/contents/${folder}/${fileName}?ref=${branch}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "История не найдена",
        details: data
      });
    }

    // decode base64
    const content = Buffer.from(data.content, "base64").toString("utf-8");
    res.json(JSON.parse(content));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   Сохранить историю в GitHub (author.html)
=========================== */
app.post("/api/save-story", async (req, res) => {
  try {
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const folder = process.env.STORIES_PATH || "stories";
    const token = process.env.GITHUB_TOKEN;

    const story = req.body;

    if (!story.title) {
      return res.json({ success: false, error: "Нет названия" });
    }

    const fileName = `${story.title}.json`;

    const url = `https://api.github.com/repos/${repo}/contents/${folder}/${fileName}`;

    const body = {
      message: `Добавлена история: ${story.title}`,
      content: Buffer.from(JSON.stringify(story, null, 2)).toString("base64"),
      branch
    };

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.json({
        success: false,
        error: "GitHub ошибка",
        details: data
      });
    }

    res.json({ success: true });

  } catch (err) {
    res.json({ success: false, error: err.message });
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
