#!/usr/bin/env node
// Generates docs/custom-error-*.html from src/template.html and src/pages.json,
// inlining the font and favicons from src/assets/ as data URIs.
//
//   npm run build           write docs/
//   npm run build -- --check  fail if docs/ differs from what would be written (CI)
//
// docs/ is committed because GitHub Pages serves it as-is and Cloudflare fetches
// the pages from there; the template just stops us hand-editing nine copies.
// Placeholder values are trusted HTML from this repo and are inserted verbatim.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SRC_DIR = "src";
const DOCS_DIR = "docs";
const check = process.argv.includes("--check");

const template = readFileSync(path.join(SRC_DIR, "template.html"), "utf8");
const { pages } = JSON.parse(readFileSync(path.join(SRC_DIR, "pages.json"), "utf8"));

const dataUri = (file, mime) =>
  `data:${mime};base64,${readFileSync(path.join(SRC_DIR, "assets", file)).toString("base64")}`;

const shared = {
  font_data_uri: dataUri("Lexend[wght]-latin.woff2", "font/woff2"),
  icon32_data_uri: dataUri("favicon-32x32.png", "image/png"),
  icon16_data_uri: dataUri("favicon-16x16.png", "image/png"),
};

function render(page) {
  const vars = { ...shared, title: page.title, heading: page.heading, body: page.body };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in vars)) throw new Error(`template references unknown placeholder {{${key}}}`);
    return vars[key];
  });
}

let stale = 0;
for (const page of pages) {
  for (const token of page.tokens ?? []) {
    if (!page.body.includes(token)) throw new Error(`${page.file}: body must include the Cloudflare token ${token}`);
  }
  const outPath = path.join(DOCS_DIR, page.file);
  const html = render(page);

  if (check) {
    if (existsSync(outPath) && readFileSync(outPath, "utf8") === html) {
      console.log(`✔ ${outPath} is up to date`);
    } else {
      stale++;
      console.error(`✖ ${outPath} is out of date — run \`npm run build\` and commit docs/`);
    }
  } else {
    writeFileSync(outPath, html);
    console.log(`wrote ${outPath} (${Buffer.byteLength(html)} bytes)`);
  }
}

if (check && stale) process.exit(1);
if (check) console.log(`\n✔ docs/ matches src/ for all ${pages.length} pages`);
