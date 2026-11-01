// Entry for the "api" service in vercel.json. It has to exist before the
// build (Vercel checks the path first), so it loads the built bundle that
// `npm run build` (tsup) writes to dist/. The express import marks this file
// as the Express app for Vercel.
import "express";

export { default } from "./dist/index.mjs";
