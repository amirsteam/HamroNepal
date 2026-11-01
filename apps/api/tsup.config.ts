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
  // Bundled in rather than loaded from node_modules at runtime:
  // - the shared package ships TypeScript source;
  // - sanitize-html is CommonJS but require()s htmlparser2, which is ES-module
  //   only. Node 22+ allows that, Vercel's function loader does not
  //   (ERR_REQUIRE_ESM), so the bundler compiles them together.
  noExternal: [/^@hamronepal\/shared/, "sanitize-html"],
  // Bundled CommonJS code (postcss inside sanitize-html) still calls require()
  // for Node built-ins; an ES module has no `require`, so give it a real one.
  // Without this the first sanitize call throws "Dynamic require … not supported".
  banner: {
    js: 'import { createRequire as __hnCreateRequire } from "node:module"; const require = __hnCreateRequire(import.meta.url);',
  },
});
