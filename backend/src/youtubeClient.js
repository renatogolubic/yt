import { config } from "./config.js";

export const oauthScopes = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly"
];

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

export const exchangeCodeForTokens = async () => {
  return {
    access_token: "demo-token",
    refresh_token: "demo-refresh"
  };
};

export const fetchChannel = async () => {
  return {
    id: "UC123",
    title: "Demo Channel",
    uploadsPlaylistId: "UU123"
  };
};

export const fetchUploads = async () => {
  return [
    {
      id: "short-1",
      title: "Hook in 1 second",
      thumbnailUrl: "https://placehold.co/256x144",
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      isShort: true
    },
    {
      id: "short-2",
      title: "Fast edit example",
      thumbnailUrl: "https://placehold.co/256x144",
      publishedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
      isShort: true
    }
  ];
};

export const fetchVideoMetrics = async () => {
  return {
    views: 1200,
    likes: 140,
    comments: 12,
    avgViewDurationSeconds: 35,
    avgPercentageViewed: 0.72,
    viewsFromShorts: 800,
    viewsPerHour: 110
  };
};
