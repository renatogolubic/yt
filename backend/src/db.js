import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, "..", "data.sqlite"));

db.exec(`
  CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    uploads_playlist_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    published_at TEXT NOT NULL,
    is_short INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS video_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    captured_at TEXT NOT NULL,
    views INTEGER NOT NULL,
    likes INTEGER NOT NULL,
    comments INTEGER NOT NULL,
    avg_view_duration_seconds REAL NOT NULL,
    avg_percentage_viewed REAL NOT NULL,
    views_from_shorts INTEGER NOT NULL,
    views_per_hour REAL NOT NULL,
    likes_per_view REAL NOT NULL,
    comments_per_view REAL NOT NULL
  );
`);

export default db;
