# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

HamroNepal (हाम्रो नेपाल) is a Nepali news portal: a public site and `/dashboard` (web), an Expo app (mobile), one Express + MongoDB API, and an hourly AI pipeline that turns RSS news into **pending** drafts for editors. The site is Nepali, with an English edition under `/en` (AI-translated stories). Dates are shown in both Bikram Sambat and AD.

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
npm run images:backfill -w apps/api -- --from-source --limit 50  # or link each outlet's own photo (demo only)
npm run translate -w apps/api -- --dry-run      # English versions of published stories (the hourly job runs it after ingest)
npm run print:issue -w apps/api -- --html        # weekly press PDF into apps/api/print/ (needs Chrome/Edge); --save to publish

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

- **Entry points:** `app.ts` builds the Express app. `server.ts` runs it locally. `vercel.ts` is the Vercel handler. `npm run build` (tsup, no code splitting) writes `dist/index.mjs` (the handler) and `dist/start.mjs` (the local server, `npm start`). Vercel's Express service runs the build's `index`/`app`/`server` file, so the local server must not be called `server.*`, and the `.mjs` ending keeps both ES modules wherever Vercel copies them (a `.js` file there is loaded as CommonJS and crashes). Vercel's function loader refuses `require()` of an ES-module-only package (Node 22+ allows it locally), so `sanitize-html` (CommonJS, requires the ESM-only `htmlparser2`) is bundled in through tsup's `noExternal`; CI checks the bundle with `node --no-experimental-require-module`. If Vercel logs `ERR_REQUIRE_ESM` for another package, add it to `noExternal` too. The `entrypoint` in `vercel.json` is the committed `apps/api/vercel-entry.mjs`, which re-exports `dist/index.mjs`; Vercel checks that path before building, so it cannot point into `dist/`.
- **Response shape:** routes return documents through `toApi()`/`toApiList()` (`src/lib/http.ts`), which rename `_id`→`$id` and `createdAt/updatedAt`→`$createdAt/$updatedAt`. The shared types and every UI use these `$` names (left over from Appwrite), so keep the mapping.
- **Auth:** a JWT is stored in the httpOnly cookie `hn_session`. `loadUser` re-reads the user on every request. `/auth/me` returns `null` (200) when signed out. Login compares against a dummy hash for unknown emails, so timing doesn't reveal accounts.
- **Cross-site writes:** `middleware/origin.ts` refuses POST/PATCH/DELETE under `/api` whose `Origin` is not the site, `PUBLIC_SITE_URL` or `CORS_ORIGINS` (requests without `Origin`, such as scripts, pass).
- **Roles are enforced on the server.** Most rules are in `buildUpdate` in `routes/admin/articles.ts`:
  - reporter: a "published" request becomes "pending"; cannot set featured/breaking; edits only their own unpublished articles.
  - editor: everything except delete.
  - admin: everything.
- **HTML safety:** article HTML is sanitized on save (`src/lib/sanitize.ts`, allowlist), and the web sanitizes again with DOMPurify when rendering.
- **Categories:** one `Category` collection with `type: "topic" | "location"`. Locations form a tree (province → district → municipality, via `parentId`/`level`) and carry `aliases` (Nepali/English place names) for matching. An article has one topic `categoryId` plus `locationIds`, which always include ancestors (`expandLocations`), so a Panauti story also lists under Kavre and Bagmati. Location rows come from `src/seed/data.ts`; the dashboard categories page manages topics only.
- **SEO:** `routes/seo.ts` serves `/news/:slug` by injecting that article's OG/Twitter tags, canonical/hreflang links and `NewsArticle` JSON-LD (`newsArticleJsonLd`; AI-desk stories are credited to the organisation) into the built `apps/web/dist/index.html`. Deployed, it fetches `index.html` from the web service through the `WEB_URL` binding, else from `PUBLIC_SITE_URL`. Section pages (`/category/:slug`, `/en/category/:slug`) and `/en` get their title, description and canonical the same way. The same file serves `/robots.txt` (absolute sitemap URLs; `/search` disallowed), `/sitemap.xml`, `/news-sitemap.xml` (both languages) and `/rss.xml`. `index.html` itself carries the site's Organization/WebSite JSON-LD.
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

1. Fetch the active `NewsSource` feeds. `kind: "rss"` is a normal feed. `kind: "page"` (sites with no RSS, e.g. ekantipur.com/news) reads a section page for same-site links with a date in the path, then the newest 15 articles for their publish time, text and photo (`listing.ts`).
2. Dedupe by URL hash (`IngestedItem`, 30-day TTL) and by near-duplicate titles (Jaccard ≥ 0.6, last 72 h).
3. Match places with the gazetteer (`gazetteer.ts`). It allows Nepali postpositions such as "काभ्रेमा".
4. Classify in AI batches; the topic and location must come from the allowed lists.
5. Write priority locations first (`PRIORITY_DISTRICTS`, Kavre/Panauti), then let topics take turns (best story of each topic, then the second best…) so local news can't crowd out national topics such as politics; capped per topic.
6. Extract the full page with Readability.
7. AI writes a 150–300 word summary.
8. Reject unsupported numbers (हजार/लाख/करोड rewrites of source figures count as supported). Leftover English words and other-script letters are saved as `source.aiWarnings`, shown on the AI समीक्षा card and rechecked when an editor saves.
9. Code adds the "स्रोत:" credit line.
10. With `INGEST_SOURCE_IMAGES=true` (demo only: the photos are the outlets' copyright), link the outlet's own photo (article page `og:image`, else the feed's `media:*`; logos/posters skipped, image must load) credited to the outlet (`src/ingest/images.ts`). The photo is uploaded to Cloudinary with the draft (`services/imageStore.ts`, ≤1600 px, `featuredImagePublicId` set), so it no longer depends on the outlet's server; if the upload fails the draft links to the outlet's photo instead. Otherwise, or if none loads, pick a symbolic Pexels stock photo from the writer's English `imageQuery` (`src/services/stockPhoto.ts`, skips photos used in the last 14 days). The photo is saved with `imageCredit`, which the web and mobile apps show as a caption (Pexels requires the credit). Changing the image in the dashboard clears the credit.
11. Save as `pending` under the system user "हाम्रो नेपाल AI डेस्क" (`isSystem`, cannot log in).

How it runs and is tested:

- `runIngest(opts, deps)` takes injectable `fetchAll`/`extract`/`generate`; the tests use fakes.
- A GitHub Actions workflow (`.github/workflows/ingest.yml`) runs it every hour against Atlas.
- Editors approve drafts in `/dashboard/review` (AI समीक्षा). AI drafts are never published automatically.
- **"अहिले समाचार ल्याउनुहोस्"** on AI समीक्षा (`POST /admin/ingest/start`, editors and admins) runs the job now instead of waiting for the schedule (GitHub often starts the "hourly" cron only every few hours). With `GITHUB_DISPATCH_TOKEN` (fine-grained, Actions read/write) it starts the GitHub workflow via `workflow_dispatch` (`services/ingestTrigger.ts`; the repo comes from `GITHUB_REPO` or Vercel's `VERCEL_GIT_REPO_*`), and the page checks every 30 s and reloads when the run finishes. Without a token it runs a small batch in the request (2 drafts on Vercel, 5 elsewhere). It refuses (409) while an unfinished run started in the last 15 min.
- **Drafts without images:** this happens when the hourly job runs with `INGEST_SOURCE_IMAGES=false` (repo variable) and no `PEXELS_API_KEY` secret. To repeat the photo fix, run `npm run images:backfill -w apps/api -- --from-source --limit 50` from a regular PC. It links each outlet's own photo, so it's for the demo only.
- **Sites that block GitHub's servers:** eKantipur and Ukera return 403 to the hourly job but work from a regular PC.

### English edition (`/en`)

The same site in English at `/en`, `/en/news/<slug>`, `/en/category/<slug>`, `/en/search`. Stories are machine-translated; the dashboard stays Nepali.

- **Storage:** `Article.en` holds `title/excerpt/content`, the `sourceHash` of the Nepali it was made from, `model` and `edited`. `Category.nameEn` holds English names (the seed fills topics and places).
- **Translating:** `ai/translate.ts` translates faithfully and carries the "स्रोत:" credit over as "Source:". `services/translations.ts` (`npm run translate`, the last step of the hourly workflow) redoes stories that have no English, or whose Nepali changed since (hash differs). English a person edited (`edited: true`) is never replaced.
- **On publish:** saving an article as published (approve in AI समीक्षा, or the editor form) translates it in the same request (`translateIfPublished` in `routes/admin/articles.ts`, capped at 40 s so it stays well inside a Vercel function's time limit), so it appears on `/en` at once. If the AI fails or is slow, publishing still succeeds and the hourly job (`--limit 40`) catches up. GitHub runs that "hourly" job only every few hours, so don't rely on it for new stories.
- **Public API:** `?lang=en` swaps in the English title/excerpt/content and category names, and adds `lang` to each article. On the English site, lists hold only translated stories; a single untranslated story comes back in Nepali with `lang: "ne"`. English search matches `en.title`/`en.excerpt`.
- **SEO:** `/en/news/:slug` gets English meta tags. Every article page links both languages with hreflang. An untranslated story's English page is canonical to the Nepali one. The sitemap lists translated stories under `/en`.
- **Web:** `lib/i18n.ts` reads the language from the URL (`useT()` gives `lang`, the strings `t`, `to(path)` for local links and `num()` for digits). The router mounts the same pages under `/` and `/en`. Services take a `lang` argument and add `?lang=en` only for English, so Nepali URLs and caches are unchanged. Put new reader-facing text in both tables in `i18n.ts`, link with `to()`, and pass `lang` to services and to the shared date helpers. The header has a link to the same page in the other language. The Nepali tags are hidden on the English site.
- **Dashboard:** the article editor has an "अंग्रेजी संस्करण" section with the English fields, the translation status and "AI ले अहिले अनुवाद गर्नुहोस्" (`POST /admin/articles/:id/translate`, which translates the saved Nepali). The form sends `en` only when someone changed it, because sending it marks the English as edited by a person. The categories form has the English name.
- **Mobile:** the app is Nepali only.

### Print edition (`apps/api/src/print`)

A weekly press PDF: 318 × 483 mm trim plus 3 mm bleed, CMYK, and 6 pages, matching the paper's existing weekly.

- **Pipeline:** `issue.ts` loads the week's **published** articles and dedupes near-identical titles. `plan.ts` (pure, tested) places them; `render.ts` builds one HTML document; `generate.ts` prints it with an installed Chrome/Edge through `puppeteer-core` (no browser download; `CHROME_PATH` overrides).
- **Page plan:**
  - Front page: 1 lead, 3 side and 3 bottom stories, and a "भित्री पृष्ठमा" index.
  - Pages 2–6 are राष्ट्रिय, स्थानीय (Kavre first), अर्थ…, अन्तर्राष्ट्रिय and खेलकुद…, each with a lead and six stories.
  - Short sections are topped up; a section with none of its own stories is labelled "विविध".
- **Text fitting:** a script in the page (`FIT_SCRIPT`) shrinks long headlines and cuts each story to its box, ending it with "…". Every story has a QR code to `/n/<id>`, which redirects to `/news/<slug>`.
- **Fonts:** headlines use static subset Anek Devanagari instances embedded as data URIs (`printFonts.ts`, OFL). Chrome embeds variable fonts as Type 3, which presses dislike. Body text is Mukta from Google Fonts. The flag is embedded too (`flagImage.ts`).
- **Photos (PDF mode only):** the PDF step fetches photos itself (CORS allowed), and the page re-encodes them as JPEG at about 200 ppi. Outlets' WebP files would otherwise be stored losslessly: about 17 MB instead of 3 MB.
- **Editorial (सम्पादकीय):** an editor-written article in the `sampadakiya` topic (`EDITORIAL_TOPIC`). The pipeline never uses this topic, and the seed adds missing topics. The week's latest editorial takes a full-height column on page 2, which then holds a lead and 4 stories.
- **Print ads** are Promotions with `print-*` placements; the public `/api/promotions` excludes them. Ads whose dates cover the issue day are placed:
  - `print-full`: a whole inner page from the back, never page 2, filling the bleed.
  - `print-half`: the lower half of a page.
  - `print-box`: a story box, at most 2 per page, spread from the back.
  - `print-strip`: below the front page's bottom row.

  Ads that don't fit are reported in `plan.unplacedAds`. Images are fetched at 300 dpi for their slot.
- **Press step (`press.ts`):**
  1. pdf-lib rewrites Chrome's `rg`/`RG` vector colours to CMYK. Neutrals go on K only, with near-black as 100% K so small text stays sharp; brand colours get fixed inks; other colours are capped at 240% total ink.
  2. Ghostscript converts the photos (`PRINT_ICC_PROFILE` optional; it must be found or set as `GS_PATH`).
  3. pdf-lib sets an exact 318 × 483 mm TrimBox centred in the bleed.

  The page CSS is 324 × 489 mm; the screen preview shows the trim as a dashed line. `--rgb` skips this step.
- **Running it:**
  - `npm run print:issue -w apps/api` writes `apps/api/print/*.pdf`; this folder is gitignored.
  - `--save` uploads the PDF to Cloudinary (raw) and records a `PrintIssue`, which advances the अंक number. It refuses to run while `PUBLIC_SITE_URL` is localhost.
  - `.github/workflows/print.yml` runs it every Friday at 18:00 NPT.
  - Dashboard → प्रिन्ट संस्करण lists issues and opens `/api/admin/print/preview`, which is the same HTML without PDF mode. Vercel has no browser, so it never makes PDFs itself.
- **Settings:** `PRINT_*` env vars (registration no., price, email, pages, first issue date, issue offset).

### Web (`apps/web`)

- **Performance:** the dashboard pages are lazy-loaded in `router.tsx`, so readers never download them. Fonts are linked from `index.html` with preconnect (not `@import` in CSS). Cards and the article photo use `srcset` (`getArticleImageSrcSet`) for Cloudinary/Pexels images.
- **Head tags in the app:** `Layout` sets the canonical link per page and `noindex` on search (`lib/seo.ts`); an untranslated story's English page points its canonical at the Nepali one.
- **Data access:** components never call `fetch`. Data goes through `src/services/*`, which use `src/lib/api.ts` (`credentials: "include"`, throws `ApiError`).
- **Auth state:** `AuthContext` exposes `user` and `author`, which are the same object from `/auth/me`.
- **Article body editor:** `components/dashboard/RichTextEditor.tsx` (Tiptap 3) is lazy-loaded by the article form, so readers never download it. It offers only what `sanitizeArticleHtml` keeps; code marks/blocks are off. Links must be http(s)/mailto, and images upload to Cloudinary and ask for alt text. There is also an HTML view. If you allow a new tag in the editor, add it to the sanitizer allowlist too.
- **Menus:** `Header.tsx` builds the topic links and the स्थानीय (province → district) menu from `/api/categories`.
- **Weather:** `WeatherWidget.tsx` shows `/api/weather?city=<slug>` for a city from `WEATHER_CITIES` (shared `weather.ts`). The default is Panauti (`WEATHER_*` env); readers can pick another city or "मेरो स्थान", and the choice is saved in localStorage. For "मेरो स्थान", only the nearest listed city is sent; the reader's coordinates stay in the browser. Clicking it opens the official DHM forecast (`OFFICIAL_WEATHER_URL`). The API caches each city for 15 minutes and serves only listed cities.
- **Advertisements:** banner ads are the `Promotion` model, managed by admins in `/dashboard/promotions` (विज्ञापन). They're called "promotions" in code and URLs so ad blockers don't hide slots by name.
  - **Placements:** `header` (under the header, every page), `home` (two home slots, `nth` 0/1), `sidebar` (article + category pages), `article` (after the story text) and `popup` (once per browser session).
  - **Data:** `PromoProvider` (in `Layout`) loads the running ads once from `GET /api/promotions`, and `<PromoSlot placement>` shows one, labelled "विज्ञापन". Clicks go through `/api/promotions/:id/click`, which counts the click and redirects; views are counted once a banner is half on screen.
  - **Mobile:** the mobile app does not show ads.
- **Site settings (white-label):** Dashboard → साइट सेटिङ (admin only, `SettingsPage.tsx`) edits one `SiteSettings` document: name, tagline and description (ne/en), logo, favicon, share image, the flag switch, colours (primary/secondary/ink), contact, social links, the English edition switch and print masthead details. Defaults and helpers (`mergeSiteSettings`, `darken`, `contrastRatio`, `aiDeskName`) are in shared `site.ts`.
  - **API:** `GET /api/settings` is public; `PUT /api/admin/settings` is admin-only and validated (http(s) links, `#RRGGBB` colours). `services/settings.ts` caches the settings for 60 s.
  - **Server uses:** `seo.ts` (template tags, titles, structured data, RSS, news sitemap), the AI writer prompt, the "<name> AI डेस्क" byline, and the print masthead and colours (`PRINT_*` env only fills gaps).
  - **Web:** `lib/settings.tsx` (`SettingsProvider`, `useSettings`) caches settings in localStorage and sets the colour CSS variables, which all Tailwind colour utilities follow. `index.html` applies the cached colours before first paint. `useT()` merges the name and tagline into the strings, `SiteLogo` draws the logo or flag + wordmark, contact, social links and the registration number (`print.regNo`, as "दर्ता नं.") appear in a top bar above the desktop header, in the mobile menu and in the footer (`SocialLinks.tsx`, each hidden when empty), and bylines show the current name.
  - **Limits:** the Nepali home page `/` is a static file, so its built-in meta tags keep the default name until the browser updates the title. The mobile app is not themed.
- **Secrets:** only `VITE_API_URL` belongs in `VITE_*`. All secrets live in `apps/api/.env`, and `EXPO_PUBLIC_*` follows the same rule.

### Deployment

- **Vercel** (`vercel.json`) uses [Vercel Services](https://vercel.com/docs/services) (beta): one project, one domain, two services.
  - `api`: `apps/api`, framework `express`, entrypoint `vercel-entry.mjs` (loads `dist/index.mjs`, built by `npm run build`) (tsup bundles the shared TypeScript package; Vercel's Express mode does not bundle). It has one binding, `WEB_URL` → `web`, used only to read `index.html` for the SEO pages.
  - `web`: `apps/web`, framework `vite`, output `dist`, with its own SPA fallback rewrite to `/index.html`.
  - Both install from the repo root (`cd ../.. && npm ci`) because of the npm workspaces.
  - Top-level rewrites send `/api/*`, `/news/:slug`, `/en/news/:slug`, `/en`, `/category/:slug`, `/en/category/:slug`, `/n/:id`, `/robots.txt`, the sitemaps and RSS to `api`; everything else goes to `web`. A new server-rendered path needs a rewrite here too.
  - In services mode, build keys (`functions`, `buildCommand`, `outputDirectory`, …) belong inside a service, not at the top level. `vercel dev` runs both services together locally.
- **Security headers** (`vercel.json`, every path except `/api/`): a CSP (scripts only from the site; styles/fonts also from Google Fonts; images from any https host; no frames), HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy and Permissions-Policy (geolocation for the weather's "मेरो स्थान"). If you add a script, embed or third-party service, add its host to the CSP. The API's headers come from helmet.
- **Design source files** (e.g. `design/og-image.psd`) stay out of `apps/web/public`, which is published as is.
- **Share images:** `apps/web/public/og-image.png` (1200 × 630, what Facebook/X/WhatsApp show for the home page) is a framed screenshot of the home page with the banner ad cut out; `design/social-square.png` (1080 × 1080) is the same for Instagram posts. The structured-data logo is `public/brand/logo-square.png`, not the share image. The share tags use `PUBLIC_SITE_URL`, so a wrong value there means no preview image.
- **Database and images:** MongoDB Atlas and Cloudinary. Cloudinary is set either with `CLOUDINARY_URL` or with the three separate `CLOUDINARY_*` values.

## Conventions

- TypeScript only, functional React components, mobile-first UI. All UI text is in Nepali (reader pages also in English, via `lib/i18n.ts`), and every screen handles its loading and error states (from `.github/copilot-instructions.md` and `.github/AGENTS.MD`).
- **Design tokens** live in the `@theme` block of `apps/web/src/index.css`, not `:root`. Tailwind v4 only generates utilities (`text-primary`, `hover:bg-secondary-dark`, `bg-primary/10`) for `@theme` colours. Colours come from the Nepali flag: crimson `primary`, blue `secondary`, navy `ink` for headlines.
- **Type:** headings use Anek Devanagari (semi-condensed); body text uses Mukta. Headings get no colour from the base styles, so they can inherit white on dark bars; add `text-ink` where needed. Don't use italics, because Devanagari has no true italic.
- **The pennant** (`components/ui/Pennant.tsx`, inside `SectionTitle`) is the site's mark. Use `SectionTitle` for section headings.
- **The flag:** `NepalFlag` sits beside the logo and the footer name. `public/brand/nepal-flag.webp` is the waving version (about 100 KB), shown on desktop only. `nepal-flag-still.png` is shown on phones and with reduced motion. Both were made from the original 1 MB GIF with Pillow (128/112 px tall); don't link the GIF itself.
- **Motion:** use `m` from `motion/react` inside `LazyMotion` (features load lazily), not `motion.*`. `MotionConfig reducedMotion="user"` respects reduced motion; add `motion-reduce:` to CSS transitions too. Keep page-load motion to the top story; other motion should answer a reader's action.
- Use the shared helpers for BS dates (`formatBSDate`, `formatDualDate`, `toNepaliDigits`). Don't copy BS-date code into an app.
- The BS calendar table for 2080/2081 is known to be off by a day.
