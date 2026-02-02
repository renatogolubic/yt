import "dotenv/config";

export const config = {
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || "",
  sessionSecret: process.env.SESSION_SECRET || "",
  port: process.env.PORT || 4000
};

export const getMissingOAuthEnv = () => {
  const missing = [];

  if (!config.googleClientId) {
    missing.push("GOOGLE_CLIENT_ID");
  }

  if (!config.googleClientSecret) {
    missing.push("GOOGLE_CLIENT_SECRET");
  }

  if (!config.googleRedirectUri) {
    missing.push("GOOGLE_REDIRECT_URI");
  }

  return missing;
};
