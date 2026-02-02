import cors from "cors";
import express from "express";
import videosRouter from "./routes/videos.js";
import { fetchMetricsJob } from "./jobs/fetchMetrics.js";
import { getMissingOAuthEnv, config } from "./config.js";
import { exchangeCodeForTokens, oauthScopes, getAuthUrl } from "./youtubeClient.js";
import { saveTokens } from "./authStore.js";

const app = express();
app.use(
  cors({
    origin: config.frontendUrl
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/auth/url", (req, res) => {
  const missing = getMissingOAuthEnv();

  if (missing.length > 0) {
    return res.status(400).json({
      error: `Missing required OAuth environment variables: ${missing.join(", ")}.`,
      missing
    });
  }

  res.json({
    url: getAuthUrl(),
    scopes: oauthScopes
  });
});

app.get("/api/auth/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${config.frontendUrl}/?auth=error`);
  }

  if (!code) {
    return res.status(400).json({ error: "Missing OAuth code." });
  }

  try {
    const tokenResponse = await exchangeCodeForTokens(code);
    const expiresAt = tokenResponse.expires_in
      ? Date.now() + tokenResponse.expires_in * 1000
      : null;

    await saveTokens({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt
    });

    return res.redirect(`${config.frontendUrl}/?auth=success`);
  } catch (authError) {
    console.error(authError);
    return res.redirect(`${config.frontendUrl}/?auth=error`);
  }
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
