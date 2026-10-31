# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

HamroNepal (हाम्रो नेपाल) is a Nepali news portal: a public site and `/dashboard` (web), an Expo app (mobile), one Express + MongoDB API, and an hourly AI pipeline that turns RSS news into **pending** drafts for editors. All UI text is Nepali. Dates are shown in both Bikram Sambat and AD.

## Commands

npm workspaces cover `packages/shared`, `apps/api` and `apps/web`. `apps/mobile` is **not** a workspace (React 18 vs 19) and is installed on its own.

```bash
npm install                      # root: shared + api + web
npm run dev                      # API :4000 + Vite :5173 (Vite proxies /api, sitemaps, rss to API_PROXY_TARGET)
npm run build                    # web (tsc -b && vite build), then api (tsup → apps/api/dist)
npm run typecheck                # all workspaces
npm test -w apps/api             # vitest + mongodb-memory-server (first run downloads mongod)

# single test file / single test (run inside apps/api)
npx vitest run test/ingest.test.ts
npx vitest run -t "only lets admins delete"

# API scripts (read apps/api/.env via --env-file-if-exists; real env vars win over .env)
npm run seed -w apps/api                         # idempotent: topics, 7 provinces/77 districts/municipalities, RSS sources
npm run user:set -w apps/api -- --email x@y.np --name "नाम" --role admin   # prints a password if none given
npm run ingest -w apps/api -- --dry-run --max 2  # AI pipeline, nothing saved
npm run ingest -w apps/api -- --max 5            # saves pending drafts
npm run images:backfill -w apps/api -- --dry-run # stock photos for older AI drafts (needs PEXELS_API_KEY)

# mobile
cd apps/mobile && npm install && npx expo start   # EXPO_PUBLIC_API_URL in apps/mobile/.env
cd apps/mobile && npx tsc --noEmit
```

Lint (`npm run lint`) is not clean: `react-hooks/set-state-in-effect` is used throughout the existing pages. CI (`.github/workflows/ci.yml`) therefore runs typecheck, API tests and build, but not lint.

## Architecture

### Shared package

`packages/shared` (`@hamronepal/shared`) is consumed as **TypeScript source** and has no build step. It holds the API/UI types and the BS-date code; `adToBSNepal()` uses the Asia/Kathmandu time zone. Each consumer resolves it differently:

- **API:** tsup bundles it via `noExternal`.
- **Web:** Vite resolves it as a workspace package. `apps/web/src/types` and `lib/bs-date.ts` only re-export it.
- **Mobile:** `metro.config.js` maps it with `extraNodeModules` and forces `nodeModulesPaths` to the app's own `node_modules`. Don't add a Babel alias for it, because that breaks Metro.

### API (`apps/api`)

- **Entry points:** `app.ts` builds the Express app. `server.ts` runs it locally. `vercel.ts` is the serverless handler, re-exported by the root `api/index.mjs`.
- **Response shape:** routes return documents through `toApi()`/`toApiList()` (`src/lib/http.ts`), which rename `_id`→`$id` and `createdAt/updatedAt`→`$createdAt/$updatedAt`. The shared types and every UI use these `$` names (left over from Appwrite), so keep the mapping.
- **Auth:** a JWT is stored in the httpOnly cookie `hn_session`. `loadUser` re-reads the user on every request. `/auth/me` returns `null` (200) when signed out.
- **Roles are enforced on the server.** Most rules are in `buildUpdate` in `routes/admin/articles.ts`:
  - reporter: a "published" request becomes "pending"; cannot set featured/breaking; edits only their own unpublished articles.
  - editor: everything except delete.
  - admin: everything.
- **HTML safety:** article HTML is sanitized on save (`src/lib/sanitize.ts`, allowlist), and the web sanitizes again with DOMPurify when rendering.
- **Categories:** one `Category` collection with `type: "topic" | "location"`. Locations form a tree (province → district → municipality, via `parentId`/`level`) and carry `aliases` (Nepali/English place names) for matching. An article has one topic `categoryId` plus `locationIds`, which always include ancestors (`expandLocations`), so a Panauti story also lists under Kavre and Bagmati. Location rows come from `src/seed/data.ts`; the dashboard categories page manages topics only.
- **SEO:** `routes/seo.ts` serves `/news/:slug` by injecting that article's OG/Twitter tags into the built `apps/web/dist/index.html`. It falls back to fetching `PUBLIC_SITE_URL/index.html`. The same file serves `/sitemap.xml`, `/news-sitemap.xml` and `/rss.xml`.
- **Static index.html:** `apps/web/index.html` uses `%SITE_URL%`, which a plugin in `vite.config.ts` replaces with `PUBLIC_SITE_URL` at build time.
- **Mongoose gotchas:** `errors` is a reserved path name (the ingest run model uses `errorLog`). The article text index uses `default_language: "none"` for Devanagari.

### AI (`apps/api/src/ai`)

- `generateJSON({system, prompt, schema})` calls Gemini first and falls back to Groq. It uses plain `fetch` in JSON mode, validates the reply with zod, paces calls per provider (`AI_MIN_INTERVAL_MS`), and retries on 429/5xx.
- **Model names** come from `AI_PRIMARY_MODEL` / `AI_FALLBACK_MODEL` (defaults: `gemini-flash-lite-latest`, `openai/gpt-oss-120b`).
- **Choosing a model:**
  - Full Gemini Flash "thinks" for about 60 s per call and hits the 60 s timeout.
  - Providers retire models often. A run failing with "model not found" means the default needs to change.
- `prompts.ts` is shared by the dashboard writing assistant (`routes/admin/ai.ts`) and the pipeline. Prompts forbid inventing names or numbers.

### Ingest pipeline (`apps/api/src/ingest`)

`run.ts` runs these steps in order:

1. Fetch the active `NewsSource` RSS feeds.
2. Dedupe by URL hash (`IngestedItem`, 30-day TTL) and by near-duplicate titles (Jaccard ≥ 0.6, last 72 h).
3. Match places with the gazetteer (`gazetteer.ts`). It allows Nepali postpositions such as "काभ्रेमा".
4. Classify in AI batches; the topic and location must come from the allowed lists.
5. Write priority locations first (`PRIORITY_DISTRICTS`, Kavre/Panauti), capped per topic.
6. Extract the full page with Readability.
7. AI writes a 150–300 word summary.
8. Reject unsupported numbers (हजार/लाख/करोड rewrites of source figures count as supported). Leftover English words and other-script letters are saved as `source.aiWarnings`, shown on the AI समीक्षा card and rechecked when an editor saves.
9. Code adds the "स्रोत:" credit line.
10. With `INGEST_SOURCE_IMAGES=true` (demo only: the photos are the outlets' copyright), link the outlet's own photo (article page `og:image`, else the feed's `media:*`; logos/posters skipped, image must load) credited to the outlet (`src/ingest/images.ts`). Otherwise, or if none loads, pick a symbolic Pexels stock photo from the writer's English `imageQuery` (`src/services/stockPhoto.ts`, skips photos used in the last 14 days). The photo is saved with `imageCredit`, which the web and mobile apps show as a caption (Pexels requires the credit). Changing the image in the dashboard clears the credit.
11. Save as `pending` under the system user "हाम्रो नेपाल AI डेस्क" (`isSystem`, cannot log in).

How it runs and is tested:

- `runIngest(opts, deps)` takes injectable `fetchAll`/`extract`/`generate`; the tests use fakes.
- A GitHub Actions workflow (`.github/workflows/ingest.yml`) runs it every hour against Atlas.
- Editors approve drafts in `/dashboard/review` (AI समीक्षा). AI drafts are never published automatically.

### Web (`apps/web`)

- **Data access:** components never call `fetch`. Data goes through `src/services/*`, which use `src/lib/api.ts` (`credentials: "include"`, throws `ApiError`).
- **Auth state:** `AuthContext` exposes `user` and `author`, which are the same object from `/auth/me`.
- **Menus:** `Header.tsx` builds the topic links and the स्थानीय (province → district) menu from `/api/categories`.
- **Secrets:** only `VITE_API_URL` belongs in `VITE_*`. All secrets live in `apps/api/.env`, and `EXPO_PUBLIC_*` follows the same rule.

### Deployment

- **Vercel** (`vercel.json`): the static `apps/web/dist` plus one function, `api/index.mjs`. Rewrites send `/api/*`, `/news/:slug`, the sitemaps and RSS to the function; everything else goes to the SPA.
- **Database and images:** MongoDB Atlas and Cloudinary. Cloudinary is set either with `CLOUDINARY_URL` or with the three separate `CLOUDINARY_*` values.

## Conventions

- TypeScript only, functional React components, mobile-first UI. All UI text is in Nepali, and every screen handles its loading and error states (from `.github/copilot-instructions.md` and `.github/AGENTS.MD`).
- Use the shared helpers for BS dates (`formatBSDate`, `formatDualDate`, `toNepaliDigits`). Don't copy BS-date code into an app.
- The BS calendar table for 2080/2081 is known to be off by a day.
