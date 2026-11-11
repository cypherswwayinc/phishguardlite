// Builds the extension into ./dist.
// Each entry point is bundled into ONE self-contained classic script (IIFE).
// This matters: Chrome loads manifest content scripts as classic scripts, so a content script
// that `import`s a shared chunk (what the previous Vite build produced) fails to load at all.

import { createRequire } from "node:module";
import { cpSync, mkdirSync, rmSync, readFileSync } from "node:fs";

const { build } = createRequire(import.meta.url)("esbuild");

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

await build({
  entryPoints: {
    content: "src/content.ts",
    background: "src/background.ts",
    options: "src/options/index.ts",
  },
  bundle: true,
  format: "iife",
  target: "chrome110",
  outdir: "dist",
  legalComments: "none",
  logLevel: "info",
});

cpSync("manifest.json", "dist/manifest.json");
cpSync("src/content.css", "dist/content.css");
cpSync("src/options/index.html", "dist/index.html");
cpSync("public/icons", "dist/icons", { recursive: true });

// Guard against regressing to a content script that needs other files to load.
for (const f of ["content.js", "background.js", "options.js"]) {
  const src = readFileSync(`dist/${f}`, "utf8");
  if (/^\s*import[\s{*]/m.test(src) || /^\s*export[\s{*]/m.test(src)) {
    console.error(`dist/${f} contains ES module import/export; it must be a single classic script.`);
    process.exit(1);
  }
}
console.log("Build OK -> dist/");
