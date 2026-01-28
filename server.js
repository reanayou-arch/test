import express from "express";
import fetch from "node-fetch";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* ================================
   ✅ Главная страница = меню
================================ */
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

/* ================================
   ✅ Проверка Groq ключа
================================ */
app.get("/testkey", (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.send("❌ GROQ_API_KEY НЕ найден");
  }
  res.send("✅ GROQ_API_KEY подключён");
});

/* ================================
   ✅ Groq Chat API
================================ */
app.post("/api/chat", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================================
   ✅ GitHub Save Story API
================================ */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const STORIES_PATH = process.env.STORIES_PATH || "stories";

/* --- Сохранение истории в GitHub --- */
app.post("/api/save-story", async (req, res) => {
  try {
    if (!GITHUB_TOKEN) return res.status(500).json({ error: "Нет GITHUB_TOKEN" });
    if (!GITHUB_REPO) return res.status(500).json({ error: "Нет GITHUB_REPO" });

    const story = req.body;

    if (!story.title) {
      return res.status(400).json({ error: "Нет названия истории" });
    }

    const filename =
      story.title.toLowerCase().replace(/\s+/g, "_") + ".json";

    const filePath = `${STORIES_PATH}/${filename}`;

    const contentBase64 = Buffer.from(
      JSON.stringify(story, null, 2)
    ).toString("base64");

    /* Проверяем существует ли файл */
    let sha = null;
    const checkUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

    const checkRes = await fetch(checkUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (checkRes.status === 200) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }

    /* Загружаем файл */
    const uploadRes = await fetch(checkUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        message: `Save story: ${story.title}`,
        content: contentBase64,
        branch: GITHUB_BRANCH,
        sha,
      }),
    });

    const uploadData = await uploadRes.json();

    res.json({
      success: true,
      file: filename,
      url: uploadData.content?.html_url,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* --- Получить список историй --- */
app.get("/api/stories", async (req, res) => {
  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${STORIES_PATH}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });

    const data = await response.json();

    if (!Array.isArray(data)) {
      return res.status(500).json({ error: "Папка stories не найдена" });
    }

    res.json(
      data.map((f) => ({
        name: f.name,
        download_url: f.download_url,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================================
   ✅ Render порт
================================ */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Horror-Studio работает на порту", PORT);
});
