/**
 * Runtime configuration, read once from environment variables.
 */

function str(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : fallback;
}

const nodeEnv = str("NODE_ENV", "development");

export const config = {
  nodeEnv,
  isProd: nodeEnv === "production",
  isTest: nodeEnv === "test",
  port: num("PORT", 4000),
  mongoUri: str("MONGODB_URI"),
  jwtSecret: str("JWT_SECRET"),
  cookieSecure: str("COOKIE_SECURE", nodeEnv === "production" ? "true" : "false") === "true",
  publicSiteUrl: str("PUBLIC_SITE_URL", "http://localhost:5173").replace(/\/$/, ""),
  corsOrigins: str("CORS_ORIGINS")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  /** Either CLOUDINARY_URL, or the three separate CLOUDINARY_* values. */
  cloudinary: {
    url: str("CLOUDINARY_URL"),
    cloudName: str("CLOUDINARY_CLOUD_NAME"),
    apiKey: str("CLOUDINARY_API_KEY"),
    apiSecret: str("CLOUDINARY_API_SECRET"),
  },

  ai: {
    geminiKey: str("GEMINI_API_KEY"),
    groqKey: str("GROQ_API_KEY"),
    primaryModel: str("AI_PRIMARY_MODEL", "gemini-flash-lite-latest"),
    fallbackModel: str("AI_FALLBACK_MODEL", "openai/gpt-oss-120b"),
    minIntervalMs: num("AI_MIN_INTERVAL_MS", 4000),
  },

  ingest: {
    maxDrafts: num("INGEST_MAX_DRAFTS", 10),
    maxPerCategory: num("INGEST_MAX_PER_CATEGORY", 3),
    minConfidence: num("INGEST_MIN_CONFIDENCE", 0.6),
    maxAgeHours: num("INGEST_MAX_AGE_HOURS", 24),
    fetchPages: str("INGEST_FETCH_PAGES", "true") === "true",
  },

  weather: {
    apiKey: str("OPENWEATHER_API_KEY"),
    lat: num("WEATHER_LAT", 27.5846),
    lon: num("WEATHER_LON", 85.5147),
    label: str("WEATHER_LABEL", "पनौती"),
  },

  rateLimits: {
    viewsPerMinute: num("RATE_LIMIT_VIEWS_PER_MINUTE", 120),
    loginPer15Min: num("RATE_LIMIT_LOGIN_PER_15_MIN", 10),
  },
};

/** Fail fast on settings the server cannot run without. */
export function assertServerConfig(): void {
  const missing: string[] = [];
  if (!config.mongoUri) missing.push("MONGODB_URI");
  if (!config.jwtSecret) missing.push("JWT_SECRET");
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  if (config.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters long");
  }
}
