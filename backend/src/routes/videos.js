import express from "express";
import { getDb } from "../db.js";
import { evaluateVideoChecklist } from "../checklist.js";
import { loadTokens } from "../authStore.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const tokens = await loadTokens();
  if (!tokens?.accessToken) {
    res.status(401).json({ error: "Not authenticated with YouTube yet." });
    return;
  }
  const db = await getDb();
  const videos = db.all(
    `SELECT v.*, COUNT(s.id) as snapshot_count
     FROM videos v
     LEFT JOIN video_snapshots s ON v.id = s.video_id
     GROUP BY v.id
     ORDER BY v.published_at DESC`
  );
  const enriched = videos.map((video) => {
    const snapshots = db.all(
      `SELECT * FROM video_snapshots
       WHERE video_id = ?
       ORDER BY captured_at ASC`,
      [video.id]
    );
    const checklist = evaluateVideoChecklist(snapshots, video.published_at);

    return {
      ...video,
      checklist
    };
  });

  res.json({ videos: enriched });
});

router.get("/:id", async (req, res) => {
  const tokens = await loadTokens();
  if (!tokens?.accessToken) {
    res.status(401).json({ error: "Not authenticated with YouTube yet." });
    return;
  }
  const db = await getDb();
  const video = db.get("SELECT * FROM videos WHERE id = ?", [req.params.id]);
  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  const snapshots = db.all(
    `SELECT * FROM video_snapshots
     WHERE video_id = ?
     ORDER BY captured_at ASC`,
    [video.id]
  );
  const checklist = evaluateVideoChecklist(snapshots, video.published_at);

  res.json({ video, snapshots, checklist });
});

export default router;
