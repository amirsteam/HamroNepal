// Loaded before every test file (see vitest.config.ts), before app imports.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-1234";
process.env.PUBLIC_SITE_URL = "https://hamronepal.test";
process.env.AI_MIN_INTERVAL_MS = "0";
process.env.GEMINI_API_KEY = "";
process.env.GROQ_API_KEY = "";
process.env.CLOUDINARY_URL = "";
process.env.RATE_LIMIT_LOGIN_PER_15_MIN = "1000";
