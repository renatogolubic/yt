import { getDb } from "./db.js";

export const saveTokens = async ({ accessToken, refreshToken, expiresAt }) => {
  const db = await getDb();
  db.run("DELETE FROM oauth_tokens");
  db.run(
    `INSERT INTO oauth_tokens (access_token, refresh_token, expires_at)
     VALUES (?, ?, ?)`,
    [accessToken, refreshToken ?? null, expiresAt ?? null]
  );
};

export const loadTokens = async () => {
  const db = await getDb();
  return db.get(
    `SELECT access_token as accessToken,
            refresh_token as refreshToken,
            expires_at as expiresAt
     FROM oauth_tokens
     ORDER BY id DESC
     LIMIT 1`
  );
};
