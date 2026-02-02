import { getDb } from "../db.js";
import { fetchUploads, fetchVideoMetrics } from "../youtubeClient.js";

export const fetchMetricsJob = async () => {
  try {
    const db = await getDb();
    const uploads = await fetchUploads();
    const now = new Date().toISOString();

    for (const video of uploads) {
      db.run(
        `INSERT OR REPLACE INTO videos (id, channel_id, title, thumbnail_url, published_at, is_short)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          video.id,
          "demo-channel",
          video.title,
          video.thumbnailUrl,
          video.publishedAt,
          video.isShort ? 1 : 0
        ]
      );

      const metrics = await fetchVideoMetrics(video.id);
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
          metrics.viewsPerHour,
          likesPerView,
          commentsPerView
        ]
      );
    }
  } catch (error) {
    console.error("Failed to fetch metrics:", error);
  }
};
