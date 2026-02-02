import express from "express";
import db from "../db.js";
import { evaluateVideoChecklist } from "../checklist.js";

const router = express.Router();

const selectVideos = db.prepare(
  `SELECT v.*, COUNT(s.id) as snapshot_count
   FROM videos v
   LEFT JOIN video_snapshots s ON v.id = s.video_id
   GROUP BY v.id
   ORDER BY v.published_at DESC`
);

const selectSnapshots = db.prepare(
  `SELECT * FROM video_snapshots
   WHERE video_id = ?
   ORDER BY captured_at ASC`
);

router.get("/", (req, res) => {
  const videos = selectVideos.all();
  const enriched = videos.map((video) => {
    const snapshots = selectSnapshots.all(video.id);
    const checklist = evaluateVideoChecklist(snapshots, video.published_at);

    return {
      ...video,
      checklist
    };
  });

  res.json({ videos: enriched });
});

router.get("/:id", (req, res) => {
  const video = db.prepare("SELECT * FROM videos WHERE id = ?").get(req.params.id);
  if (!video) {
    res.status(404).json({ error: "Video not found" });
    return;
  }

  const snapshots = selectSnapshots.all(video.id);
  const checklist = evaluateVideoChecklist(snapshots, video.published_at);

  res.json({ video, snapshots, checklist });
});

export default router;
