import { config } from "./config.js";

export const oauthScopes = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly"
];

const youtubeBaseUrl = "https://www.googleapis.com/youtube/v3";
const oauthTokenUrl = "https://oauth2.googleapis.com/token";

export const getAuthUrl = () => {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", config.googleClientId);
  url.searchParams.set("redirect_uri", config.googleRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", oauthScopes.join(" "));

  return url.toString();
};

export const exchangeCodeForTokens = async (code) => {
  const body = new URLSearchParams({
    code,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uri: config.googleRedirectUri,
    grant_type: "authorization_code"
  });

  const response = await fetch(oauthTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OAuth token exchange failed: ${errorText}`);
  }

  return response.json();
};

const youtubeRequest = async (accessToken, endpoint, params) => {
  const url = new URL(`${youtubeBaseUrl}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YouTube API error: ${errorText}`);
  }

  return response.json();
};

const parseDurationSeconds = (isoDuration) => {
  if (!isoDuration) return 0;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
};

export const fetchChannel = async (accessToken) => {
  const data = await youtubeRequest(accessToken, "channels", {
    part: "snippet,contentDetails",
    mine: "true"
  });
  const channel = data.items?.[0];
  if (!channel) {
    throw new Error("No YouTube channel found for this account.");
  }
  return {
    id: channel.id,
    title: channel.snippet?.title ?? "YouTube Channel",
    uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads
  };
};

const fetchPlaylistItems = async (accessToken, playlistId) => {
  const uploads = [];
  let pageToken = undefined;

  do {
    const data = await youtubeRequest(accessToken, "playlistItems", {
      part: "snippet,contentDetails",
      playlistId,
      maxResults: "50",
      pageToken
    });
    uploads.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken && uploads.length < 200);

  return uploads;
};

const fetchVideoDetails = async (accessToken, videoIds) => {
  if (videoIds.length === 0) return [];
  const data = await youtubeRequest(accessToken, "videos", {
    part: "snippet,contentDetails,statistics",
    id: videoIds.join(",")
  });
  return data.items ?? [];
};

export const fetchUploads = async (accessToken) => {
  const channel = await fetchChannel(accessToken);
  const playlistItems = await fetchPlaylistItems(accessToken, channel.uploadsPlaylistId);
  const videoIds = playlistItems.map((item) => item.contentDetails?.videoId).filter(Boolean);
  const details = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const batchDetails = await fetchVideoDetails(accessToken, batch);
    details.push(...batchDetails);
  }

  const detailsById = new Map(details.map((item) => [item.id, item]));

  const videos = playlistItems
    .map((item) => {
      const id = item.contentDetails?.videoId;
      const detail = detailsById.get(id);
      const durationSeconds = parseDurationSeconds(detail?.contentDetails?.duration);
      return {
        id,
        title: detail?.snippet?.title ?? item.snippet?.title ?? "Untitled",
        thumbnailUrl:
          detail?.snippet?.thumbnails?.medium?.url ??
          item.snippet?.thumbnails?.medium?.url ??
          "",
        publishedAt: detail?.snippet?.publishedAt ?? item.snippet?.publishedAt ?? "",
        isShort: durationSeconds > 0 && durationSeconds <= 60
      };
    })
    .filter((video) => video.id);

  return { channel, videos };
};

export const fetchVideoMetricsMap = async (accessToken, videoIds) => {
  const metrics = new Map();
  if (videoIds.length === 0) return metrics;

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const data = await youtubeRequest(accessToken, "videos", {
      part: "statistics,contentDetails",
      id: batch.join(",")
    });

    for (const item of data.items ?? []) {
      const stats = item.statistics ?? {};
      metrics.set(item.id, {
        views: Number(stats.viewCount ?? 0),
        likes: Number(stats.likeCount ?? 0),
        comments: Number(stats.commentCount ?? 0),
        avgViewDurationSeconds: 0,
        avgPercentageViewed: 0,
        viewsFromShorts: 0
      });
    }
  }

  return metrics;
};
