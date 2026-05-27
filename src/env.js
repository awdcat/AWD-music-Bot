export function readEnv(options = {}) {
  const { requireToken = true, requireClientId = true } = options;
  const requiredEnv = [];

  if (requireToken) requiredEnv.push("DISCORD_TOKEN");
  if (requireClientId) requiredEnv.push("DISCORD_CLIENT_ID");

  const missing = requiredEnv.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  return {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.GUILD_ID,
    youtubeCookie: process.env.YOUTUBE_COOKIE || undefined
  };
}
