import express from "express";
import fetch from "node-fetch";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.static("public"));

/* ===========================
   Главная страница
=========================== */
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

/* ===========================
   DEBUG переменные
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
   GitHub helper headers
=========================== */
function githubHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "Horror-Studio-Render"
  };
}

/* ===========================
   Получить список историй
=========================== */
app.get("/api/stories", async (req, res) => {
  try {
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const folder = process.env.STORIES_PATH || "stories";

    const url = `https://api.github.com/repos/${repo}/contents/${folder}?ref=${branch}`;

    const response = await fetch(url, {
      headers: githubHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "GitHub API ошибка",
        status: response.status,
        githubMessage: data.message,
        urlUsed: url
      });
    }

    res.json(data.filter(f => f.name.endsWith(".json")));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   Получить одну историю
=========================== */
app.get("/api/story/:name", async (req, res) => {
  try {
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const folder = process.env.STORIES_PATH || "stories";

    const fileName = req.params.name;

    const url = `https://api.github.com/repos/${repo}/contents/${folder}/${fileName}?ref=${branch}`;

    const response = await fetch(url, {
      headers: githubHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "История не найдена",
        githubMessage: data.message
      });
    }

    const content = Buffer.from(data.content, "base64").toString("utf8");
    res.json(JSON.parse(content));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===========================
   Сохранить историю
=========================== */
app.post("/api/save-story", async (req, res) => {
  try {
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const folder = process.env.STORIES_PATH || "stories";

    const story = req.body;

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
        ...githubHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.json({
        success: false,
        error: data.message
      });
    }

    res.json({ success: true });

  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

/* ===========================
   Render порт
=========================== */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("✅ Horror-Studio работает на порту", PORT);
});
