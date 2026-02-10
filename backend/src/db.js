import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import initSqlJs from "sql.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "..", "data.sqlite");

let dbPromise;

const bootstrapSchema = (db) => {
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

    CREATE TABLE IF NOT EXISTS oauth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at INTEGER
    );
  `);
};

const createDatabase = async () => {
  const SQL = await initSqlJs();
  const dbFileExists = fs.existsSync(dbPath);
  const db = dbFileExists
    ? new SQL.Database(fs.readFileSync(dbPath))
    : new SQL.Database();
  bootstrapSchema(db);

  const persist = () => {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  };

  const run = (sql, params = {}) => {
    const statement = db.prepare(sql);
    statement.bind(params);
    statement.step();
    statement.free();
    persist();
  };

  const all = (sql, params = {}) => {
    const statement = db.prepare(sql);
    statement.bind(params);
    const rows = [];
    while (statement.step()) {
      rows.push(statement.getAsObject());
    }
    statement.free();
    return rows;
  };

  const get = (sql, params = {}) => {
    const statement = db.prepare(sql);
    statement.bind(params);
    const row = statement.step() ? statement.getAsObject() : undefined;
    statement.free();
    return row;
  };

  return { run, all, get };
};

export const getDb = async () => {
  if (!dbPromise) {
    dbPromise = createDatabase();
  }
  return dbPromise;
};
