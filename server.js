import express from "express";
import fetch from "node-fetch";
import path from "path";

const app = express();
app.use(express.json());

/* ===============================
   ✅ Раздача папки public
================================ */
app.use(express.static("public"));

/* ===============================
   ✅ ENV переменные GitHub
================================ */
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const STORIES_PATH = process.env.STORIES_PATH || "stories";

/* ===============================
   ✅ Главная страница = index.html
================================ */
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

/* ===============================
   ✅ Страница автора
================================ */
app.get("/author", (req, res) => {
  res.sendFile(path.resolve("public/author.html"));
});

/* ===============================
   ✅ Страница игры
================================ */
app.get("/play", (req, res) => {
  res.sendFile(path.resolve("public/play.html"));
});

/* ===============================
   ✅ Groq Chat API
================================ */
app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "Нет GROQ_API_KEY"
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
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   ✅ GitHub: Получить список историй
====================================================== */
app.get("/api/stories", async (req, res) => {
  try {
    const url =
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${STORIES_PATH}?ref=${GITHUB_BRANCH}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      }
    });

    const data = await response.json();

    if (!Array.isArray(data)) {
      return res.json([]);
    }

    const stories = data
      .filter((f) => f.name.endsWith(".json"))
      .map((f) => f.name);

    res.json(stories);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   ✅ GitHub: Загрузить одну историю
====================================================== */
app.get("/api/story/:file", async (req, res) => {
  try {
    const file = req.params.file;

    const url =
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${STORIES_PATH}/${file}?ref=${GITHUB_BRANCH}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      }
    });

    const data = await response.json();

    if (!data.content) {
      return res.status(404).json({ error: "История не найдена" });
    }

    const decoded = Buffer.from(data.content, "base64").toString("utf8");
    res.json(JSON.parse(decoded));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================================================
   ✅ GitHub: Сохранить историю из author.html
====================================================== */
app.post("/api/save-story", async (req, res) => {
  try {
    const story = req.body;

    if (!story.title) {
      return res.status(400).json({
        error: "Нет названия истории"
      });
    }

    const filename =
      story.title.toLowerCase().replace(/\s+/g, "_") + ".json";

    const url =
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${STORIES_PATH}/${filename}`;

    const contentBase64 = Buffer.from(
      JSON.stringify(story, null, 2)
    ).toString("base64");

    const upload = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Добавлена история: ${story.title}`,
        content: contentBase64,
        branch: GITHUB_BRANCH
      })
    });

    const result = await upload.json();

    if (!upload.ok) {
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

/* ===============================
   ✅ Render Port
================================ */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("🚀 Horror-Studio работает на порту", PORT);
});
