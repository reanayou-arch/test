import express from "express";
import fetch from "node-fetch";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* ============================
   ✅ ENV переменные
============================ */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const STORIES_PATH = process.env.STORIES_PATH || "stories";

/* ============================
   ✅ Главная страница (Меню)
============================ */

app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

/* ============================
   ✅ Проверка GROQ ключа
============================ */

app.get("/testkey", (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.send("❌ GROQ_API_KEY НЕ найден");
  }
  res.send("✅ GROQ_API_KEY подключён");
});

/* ============================
   ✅ Groq Chat API
============================ */

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

/* ============================
   ✅ Автосоздание папки stories/
============================ */

async function ensureStoriesFolder() {
  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${STORIES_PATH}?ref=${GITHUB_BRANCH}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });

    /* ✅ Если папки нет → создаём */
    if (response.status === 404) {
      console.log("⚠ Папка stories не найдена → создаю...");

      const createUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${STORIES_PATH}/.keep`;

      const encoded = Buffer.from("folder created").toString("base64");

      await fetch(createUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({
          message: "Создана папка stories/",
          content: encoded,
          branch: GITHUB_BRANCH,
        }),
      });

      console.log("✅ stories/ создана автоматически!");
    } else {
      console.log("✅ stories/ уже существует");
    }
  } catch (err) {
    console.log("❌ Ошибка автосоздания stories:", err.message);
  }
}

/* ============================
   ✅ GitHub Stories API
============================ */

/* ---------- GET список историй ---------- */
app.get("/api/stories", async (req, res) => {
  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${STORIES_PATH}?ref=${GITHUB_BRANCH}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      return res.status(500).json({
        error: "Ошибка GitHub API",
        details: await response.text(),
      });
    }

    const files = await response.json();

    const stories = files
      .filter((f) => f.name.endsWith(".json"))
      .map((f) => ({
        name: f.name.replace(".json", ""),
        url: f.download_url,
      }));

    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------- POST сохранить историю ---------- */
app.post("/api/saveStory", async (req, res) => {
  try {
    const { filename, content } = req.body;

    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${STORIES_PATH}/${filename}.json`;

    const encoded = Buffer.from(JSON.stringify(content, null, 2)).toString(
      "base64"
    );

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        message: `Добавлена история: ${filename}`,
        content: encoded,
        branch: GITHUB_BRANCH,
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================
   ✅ Render запуск
============================ */

const PORT = process.env.PORT || 10000;

app.listen(PORT, async () => {
  console.log("🚀 Horror-Studio работает на порту", PORT);

  /* ✅ Автопроверка stories при старте */
  await ensureStoriesFolder();
});
