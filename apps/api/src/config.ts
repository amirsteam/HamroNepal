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
  /**
   * DNS servers for looking up the database host, e.g. "8.8.8.8,1.1.1.1".
   * Only for machines whose DNS cannot resolve mongodb+srv addresses
   * ("querySrv ECONNREFUSED"). Empty = the system's DNS.
   */
  dnsServers: str("DNS_SERVERS")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
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

  /** Free stock photos for AI drafts (Pexels). Empty = use topic default images. */
  stockPhotos: {
    pexelsKey: str("PEXELS_API_KEY"),
  },

  ingest: {
    maxDrafts: num("INGEST_MAX_DRAFTS", 10),
    maxPerCategory: num("INGEST_MAX_PER_CATEGORY", 3),
    minConfidence: num("INGEST_MIN_CONFIDENCE", 0.6),
    maxAgeHours: num("INGEST_MAX_AGE_HOURS", 24),
    fetchPages: str("INGEST_FETCH_PAGES", "true") === "true",
    /**
     * Link the source outlet's own photo instead of a Pexels stock photo.
     * The photos belong to the outlets: for demos or with their permission.
     */
    sourceImages: str("INGEST_SOURCE_IMAGES", "false") === "true",
  },

  /**
   * Starting the GitHub news job from the dashboard ("अहिले समाचार ल्याउनुहोस्").
   * The token needs "Actions: read and write" on the repo. Vercel fills the
   * repo name itself; elsewhere set GITHUB_REPO ("owner/name").
   */
  github: {
    token: str("GITHUB_DISPATCH_TOKEN"),
    repo: str(
      "GITHUB_REPO",
      process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
        ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
        : ""
    ),
    ref: str("GITHUB_REF", "main"),
  },

  /** The weekly print edition (PDF for the press). */
  print: {
    name: str("PRINT_NAME", "हाम्रो नेपाल"),
    tagline: str("PRINT_TAGLINE", "तपाईंको ठाउँको, देशभरको समाचार"),
    frequency: str("PRINT_FREQUENCY", "साप्ताहिक"),
    /** Registration line shown in the masthead, e.g. "जि.प्र.का. द. नं. …". */
    regNo: str("PRINT_REG_NO"),
    /** Cover price in rupees. */
    price: str("PRINT_PRICE", "५"),
    /** Shown in the masthead box for readers' letters (hidden if empty). */
    email: str("PRINT_EMAIL"),
    pages: num("PRINT_PAGES", 6),
    /** Stories from this many days before the issue date. */
    days: num("PRINT_DAYS", 7),
    /** First issue's date (YYYY-MM-DD); "वर्ष" counts from it. */
    firstIssueDate: str("PRINT_FIRST_ISSUE_DATE"),
    /** Added to the issue number, to continue an existing paper's numbering. */
    issueOffset: num("PRINT_ISSUE_OFFSET", 0),
    /** Chrome/Edge to print with; found automatically when empty. */
    chromePath: str("CHROME_PATH"),
    /** Ghostscript (CMYK conversion); found automatically when empty. */
    gsPath: str("GS_PATH"),
    /** CMYK profile for photos from the press (e.g. a newsprint .icc); Ghostscript's default when empty. */
    iccProfile: str("PRINT_ICC_PROFILE"),
  },

  weather: {
    apiKey: str("OPENWEATHER_API_KEY"),
    lat: num("WEATHER_LAT", 27.5846),
    lon: num("WEATHER_LON", 85.5147),
    label: str("WEATHER_LABEL", "पनौती"),
    labelEn: str("WEATHER_LABEL_EN", "Panauti"),
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
