import express from "express";
import videosRouter from "./routes/videos.js";
import { fetchMetricsJob } from "./jobs/fetchMetrics.js";
import { oauthScopes, getAuthUrl } from "./youtubeClient.js";

const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/auth/url", (req, res) => {
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

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend listening on ${port}`);
});
