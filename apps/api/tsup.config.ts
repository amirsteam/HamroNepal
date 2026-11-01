import { defineConfig } from "tsup";

export default defineConfig({
  entry: { server: "src/server.ts", vercel: "src/vercel.ts" },
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  clean: true,
  // One self-contained file per entry: Vercel's Express service looks for the
  // `express` import in the entry file itself (dist/vercel.js).
  splitting: false,
  sourcemap: true,
  // The shared package ships TypeScript source, so bundle it in.
  noExternal: [/^@hamronepal\/shared/],
});
