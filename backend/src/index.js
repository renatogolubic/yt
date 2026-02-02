import cors from "cors";
import express from "express";
import videosRouter from "./routes/videos.js";
import { fetchMetricsJob } from "./jobs/fetchMetrics.js";
import { getMissingOAuthEnv, config } from "./config.js";
import { oauthScopes, getAuthUrl } from "./youtubeClient.js";

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173"
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/auth/url", (req, res) => {
  const missing = getMissingOAuthEnv();

  if (missing.length > 0) {
    return res.status(500).json({
      error: "Missing required OAuth environment variables.",
      missing
    });
  }

  res.json({
    url: getAuthUrl(),
    scopes: oauthScopes
  });
});

app.use("/api/videos", videosRouter);

const scheduleMs = 45 * 60 * 1000;
fetchMetricsJob();
setInterval(() => {
  fetchMetricsJob();
}, scheduleMs);

app.listen(config.port, () => {
  console.log(`Backend listening on ${config.port}`);
});
