import { getDb } from "../db.js";
import { loadTokens, saveTokens } from "../authStore.js";
import { fetchAnalyticsMetricsMap, fetchUploads, fetchVideoMetricsMap } from "../youtubeClient.js";
import { config } from "../config.js";

const refreshAccessToken = async (refreshToken) => {
  const body = new URLSearchParams({
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed: ${errorText}`);
  }

  return response.json();
};

export const fetchMetricsJob = async () => {
  try {
    const tokens = await loadTokens();
    if (!tokens?.accessToken) {
      console.warn("Skipping metrics fetch: no OAuth token stored yet.");
      return;
    }

    if (tokens.expiresAt && Date.now() > tokens.expiresAt && tokens.refreshToken) {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      const newExpiresAt = refreshed.expires_in
        ? Date.now() + refreshed.expires_in * 1000
        : null;

      await saveTokens({
        accessToken: refreshed.access_token,
        refreshToken: tokens.refreshToken,
        expiresAt: newExpiresAt
      });

      tokens.accessToken = refreshed.access_token;
      tokens.expiresAt = newExpiresAt;
    }

    const db = await getDb();
    const { channel, videos } = await fetchUploads(tokens.accessToken);
    const now = new Date().toISOString();
    const metricsMap = await fetchVideoMetricsMap(
      tokens.accessToken,
      videos.map((video) => video.id)
    );
    const analyticsMap = await fetchAnalyticsMetricsMap(
      tokens.accessToken,
      channel.id,
      videos
    );

    for (const video of videos) {
      const baseMetrics = metricsMap.get(video.id) ?? {
        views: 0,
        likes: 0,
        comments: 0
      };
      const analyticsMetrics = analyticsMap.get(video.id) ?? {
        avgViewDurationSeconds: 0,
        avgPercentageViewed: 0,
        viewsFromShorts: 0
      };
      const metrics = {
        ...baseMetrics,
        ...analyticsMetrics
      };
      const hoursSincePublish = video.publishedAt
        ? Math.max(
            1,
            (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60)
          )
        : 1;
      const viewsPerHour = metrics.views / hoursSincePublish;
      db.run(
        `INSERT OR REPLACE INTO videos (id, channel_id, title, thumbnail_url, published_at, is_short)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          video.id,
          channel.id,
          video.title,
          video.thumbnailUrl,
          video.publishedAt,
          video.isShort ? 1 : 0
        ]
      );
      const likesPerView = metrics.views === 0 ? 0 : metrics.likes / metrics.views;
      const commentsPerView = metrics.views === 0 ? 0 : metrics.comments / metrics.views;

      db.run(
        `INSERT INTO video_snapshots (
            video_id,
            captured_at,
            views,
            likes,
            comments,
            avg_view_duration_seconds,
            avg_percentage_viewed,
            views_from_shorts,
            views_per_hour,
            likes_per_view,
            comments_per_view
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          video.id,
          now,
          metrics.views,
          metrics.likes,
          metrics.comments,
          metrics.avgViewDurationSeconds,
          metrics.avgPercentageViewed,
          metrics.viewsFromShorts,
          viewsPerHour,
          likesPerView,
          commentsPerView
        ]
      );
    }
  } catch (error) {
    console.error("Failed to fetch metrics:", error);
  }
};
