import { defineConfig } from "tsup";

export default defineConfig({
  // index.mjs: the Vercel handler. Vercel's Express service runs the build's
  // index/app/server file, so the local server is called start.mjs to keep it
  // from being picked. ".mjs" keeps both ES modules wherever Vercel copies them.
  entry: { index: "src/vercel.ts", start: "src/server.ts" },
  format: ["esm"],
  outExtension: () => ({ js: ".mjs" }),
  platform: "node",
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // One self-contained file per entry (each imports `express` itself).
  splitting: false,
  // The shared package ships TypeScript source, so bundle it in.
  noExternal: [/^@hamronepal\/shared/],
});
