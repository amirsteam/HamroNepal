# हाम्रो नेपाल (HamroNepal)

नेपाली समाचार पोर्टल – Nepali news portal with a web site, admin dashboard, mobile app, and an AI desk that turns real local news into short, attributed drafts for editors to approve.

## What is in the repo

```text
apps/
  api/      Node + Express + Mongoose API, AI pipeline, scripts   (TypeScript)
  web/      React 19 + Vite + Tailwind: public site + /dashboard
  mobile/   Expo (React Native) app – read-only, uses the same API
packages/
  shared/   Shared types + Bikram Sambat (BS) date utilities
api/index.mjs              Vercel serverless entry (re-exports apps/api)
.github/workflows/ci.yml   Typecheck, tests, build
.github/workflows/ingest.yml  Hourly AI news run
```

| Layer | Technology |
| --- | --- |
| Database | MongoDB Atlas (free M0 is enough) |
| API | Express 5, Mongoose 8, zod, JWT in an httpOnly cookie |
| Images | Cloudinary (free tier) for uploads; Pexels (free) stock photos for AI drafts |
| AI | Google Gemini Flash-Lite (free tier) → Groq GPT-OSS 120B fallback |
| Hosting | Vercel (static site + one serverless function) |
| Scheduler | GitHub Actions (hourly) |

## Features

- **Public site:** home, topic menus (राजनीति, खेलकुद …), **स्थानीय** menus (प्रदेश → जिल्ला → नगरपालिका), article pages with BS/AD dates, search, per-article link previews, sitemap, Google News sitemap, RSS.
- **Dashboard:** articles (draft → pending → published), categories, image upload, AI writing assistant, **AI समीक्षा** (review queue), **समाचार स्रोत** (news sources and run history).
- **Roles enforced by the API:** admin / editor / reporter.
- **AI local news (hourly):**
  1. Read RSS feeds from Nepali outlets.
  2. Drop stories already seen, and near-duplicate headlines across outlets.
  3. Match place names (77 districts + towns, with Nepali postpositions like "काभ्रेमा") to find the location.
  4. AI picks the topic and confirms the location (from a fixed list only).
  5. Read the full source article and have AI write an original 150–300 word Nepali summary using only facts from the source. A "स्रोत:" credit link is added by code.
  6. Add a symbolic stock photo: the AI suggests English search words and the photo comes from [Pexels](https://www.pexels.com/api/), captioned "प्रतीकात्मक तस्बिर · फोटो: name / Pexels". Without `PEXELS_API_KEY`, the topic's default image is used.
  7. Save as **pending**. Nothing goes live until an editor approves it.

  Priority locations (Kavre / Panauti by default) are written first. Drafts with numbers that are not in the source are skipped or marked lower confidence.

## Getting started (local)

Requirements: Node 20+ and a MongoDB connection string (Atlas free tier, or a local `mongod`).

```bash
npm install                       # installs api, web and shared (workspaces)
cp apps/api/.env.example apps/api/.env   # fill in MONGODB_URI and JWT_SECRET at least
npm run seed -w apps/api          # topics, 7 provinces + 77 districts, news sources
npm run user:set -w apps/api -- --email you@example.com --name "तपाईंको नाम" --role admin
npm run dev                       # API on :4000 + web on :5173 (Vite proxies /api)
```

Open <http://localhost:5173> and the dashboard at <http://localhost:5173/dashboard/login>.

### AI news

Get free keys from [Google AI Studio](https://aistudio.google.com/apikey) and/or [Groq](https://console.groq.com/keys), put them in `apps/api/.env`, then:

```bash
npm run ingest -w apps/api -- --dry-run --max 3   # see what it would write, saves nothing
npm run ingest -w apps/api -- --max 5             # save up to 5 pending drafts
```

Review them in **Dashboard → AI समीक्षा**. Editors can replace any photo; the old credit is removed automatically.

To add photos to AI drafts saved before `PEXELS_API_KEY` was set:

```bash
npm run images:backfill -w apps/api -- --dry-run
npm run images:backfill -w apps/api
```

Free-tier limits change. Check [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) and your [Groq limits](https://console.groq.com/settings/limits). A normal hourly run makes about 2–4 classification calls plus up to 10 writing calls, paced by `AI_MIN_INTERVAL_MS`. Models are set by `AI_PRIMARY_MODEL` (default `gemini-flash-lite-latest`) and `AI_FALLBACK_MODEL` (default `openai/gpt-oss-120b`). Providers retire models often; if a run fails with "model not found", pick a current one from the provider's model list.

### Mobile app

```bash
cd apps/mobile
npm install
cp .env.example .env    # EXPO_PUBLIC_API_URL = your API (LAN IP when testing on a phone)
npx expo start
```

### Tests

```bash
npm test -w apps/api      # API + pipeline tests on an in-memory MongoDB
npm run typecheck
```

## Deploying (Vercel + Atlas + Cloudinary + GitHub Actions)

1. **MongoDB Atlas:** create a free M0 cluster and a database user. Under *Network Access*, allow `0.0.0.0/0`, because Vercel and GitHub Actions use changing IPs; this makes a strong password essential.
2. **Cloudinary:** copy the `CLOUDINARY_URL` from the dashboard.
3. **Vercel:** import the repo with the project root at the repository root (the included `vercel.json` handles build, function, and rewrites). Add environment variables: `MONGODB_URI`, `JWT_SECRET`, `PUBLIC_SITE_URL` (e.g. `https://hamronepal.com`), `CLOUDINARY_URL`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENWEATHER_API_KEY`.
4. **GitHub → Settings → Secrets and variables → Actions:** add `MONGODB_URI`, `GEMINI_API_KEY`, `GROQ_API_KEY`, and optionally `PEXELS_API_KEY`. The *AI news ingest* workflow then runs every hour. Use "Run workflow" for a manual or dry run.
5. Run `npm run seed -w apps/api` and `npm run user:set -w apps/api -- ...` once against the Atlas database (from your computer, with `MONGODB_URI` in `apps/api/.env`).

`PUBLIC_SITE_URL` is also used at build time for the share-preview links (`og:url`, `og:image`) in `apps/web/index.html`.

## Bikram Sambat dates

```ts
import { adToBSNepal, formatBSDate, formatDualDate, toNepaliDigits } from "@hamronepal/shared";

formatBSDate(adToBSNepal(new Date()));   // "१३ कार्तिक २०८३" (Nepal time zone)
formatDualDate("2025-12-29");            // { bs, ad, bsShort, weekday, relative }
toNepaliDigits(2025);                    // "२०२५"
```

## License

MIT
