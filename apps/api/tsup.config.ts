import { defineConfig } from "tsup";

export default defineConfig({
  entry: { server: "src/server.ts", vercel: "src/vercel.ts" },
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // The shared package ships TypeScript source, so bundle it in.
  noExternal: [/^@hamronepal\/shared/],
});
