import db from "../db.js";
import { fetchUploads, fetchVideoMetrics } from "../youtubeClient.js";

const insertVideo = db.prepare(
  `INSERT OR REPLACE INTO videos (id, channel_id, title, thumbnail_url, published_at, is_short)
   VALUES (@id, @channelId, @title, @thumbnailUrl, @publishedAt, @isShort)`
);

const insertSnapshot = db.prepare(
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
    ) VALUES (
      @videoId,
      @capturedAt,
      @views,
      @likes,
      @comments,
      @avgViewDurationSeconds,
      @avgPercentageViewed,
      @viewsFromShorts,
      @viewsPerHour,
      @likesPerView,
      @commentsPerView
    )`
);

export const fetchMetricsJob = async () => {
  const uploads = await fetchUploads();
  const now = new Date().toISOString();

  uploads.forEach((video) => {
    insertVideo.run({
      id: video.id,
      channelId: "demo-channel",
      title: video.title,
      thumbnailUrl: video.thumbnailUrl,
      publishedAt: video.publishedAt,
      isShort: video.isShort ? 1 : 0
    });

    const metrics = fetchVideoMetrics(video.id);
    const likesPerView = metrics.views === 0 ? 0 : metrics.likes / metrics.views;
    const commentsPerView = metrics.views === 0 ? 0 : metrics.comments / metrics.views;

    insertSnapshot.run({
      videoId: video.id,
      capturedAt: now,
      views: metrics.views,
      likes: metrics.likes,
      comments: metrics.comments,
      avgViewDurationSeconds: metrics.avgViewDurationSeconds,
      avgPercentageViewed: metrics.avgPercentageViewed,
      viewsFromShorts: metrics.viewsFromShorts,
      viewsPerHour: metrics.viewsPerHour,
      likesPerView,
      commentsPerView
    });
  });
};
