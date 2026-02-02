# Shorts Growth Radar

A two-tier web application that connects to YouTube Analytics + Data APIs and evaluates Shorts using a transparent checklist across the first 72 hours.

## Architecture

- **Frontend**: React (Vite) dashboard for video list + checklist detail
- **Backend**: Node + Express API with scheduled metrics snapshots
- **Database**: SQLite via `sql.js` (replace with Postgres/MySQL in production)

## What the app does

1. Authenticates via Google OAuth 2.0 with read-only scopes.
2. Pulls channel info and uploads playlist.
3. Flags Shorts and collects metrics every 30–60 minutes.
4. Evaluates each video against rule-based checkpoints (0–72h).

## Checklist configuration

The checklist is explicit and configurable in `backend/src/checklist.js`:

- **engagementFloor**: minimum average percentage viewed (default 0.6)
- **continuousViewsThreshold**: percentage of positive hourly deltas to call views "continuous" (default 0.15)
- **shortsFeedShareFloor**: minimum share of Shorts feed traffic (default 0.25)
- **minViewsPerHour**: baseline views/hour for 6–12h stability (default 20)
- **delayedSpikeMultiplier**: multiplier vs first 24h average (default 1.5)
- **scalingViewsPerHour**: views/hour threshold for scaling status (default 150)

## Local development

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd ../frontend
npm install
npm run dev
```

The backend runs on `http://localhost:4000`, the frontend on `http://localhost:5173`.

## Next steps

- Swap `youtubeClient.js` stubs with real OAuth + API calls.
- Add refresh token storage and per-user isolation.
- Replace the mock snapshots with real Analytics metrics.
- Add charts for views/hour + Shorts feed traffic.
