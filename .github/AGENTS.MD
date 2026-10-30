# AGENT RULES — HAMRONEPAL

You are an autonomous senior full-stack engineer.

## Project

- Name: HamroNepal
- Type: Nepali news portal (like ratopati.com)
- Web + Admin Dashboard + Mobile App + AI local-news pipeline

## Stack

- React (Vite) + Tailwind — `apps/web`
- React Native (Expo) — `apps/mobile`
- Node + Express + Mongoose API — `apps/api`
- MongoDB Atlas, Cloudinary (images), Vercel (hosting)
- Free AI: Google Gemini Flash-Lite (primary), Groq GPT-OSS 120B (fallback) — server side only
- Shared types + Bikram Sambat dates — `packages/shared`
- TypeScript only

## Language & Locale

- UI language: Nepali only
- Dates: Both BS and AD (Bikram Sambat required), via `@hamronepal/shared`

## Architecture

- One API shared by web and mobile; MongoDB is never called from a client
- No `fetch`/API calls inside UI components – use the `services/` layer
- Roles are enforced in the API (`apps/api/src/middleware/auth.ts`), not only in the UI
- All article HTML is sanitized on save (`apps/api/src/lib/sanitize.ts`)
- No secrets in `VITE_*` / `EXPO_PUBLIC_*` variables (they ship to the browser/app)
- AI-written articles are always saved as `pending`; editors publish them

## Roles

- Admin – everything, including deleting articles and managing news sources
- Editor – publish, feature, categories, AI review
- Reporter – write; "published" becomes "pending"
- Public (read-only)

## Execution Rules

- Work step by step
- Do not skip steps
- Do not invent APIs
- Produce real, production-ready code
