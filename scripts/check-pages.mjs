#!/usr/bin/env node
// Contract checks for the Cloudflare custom error pages in docs/.
//
// Cloudflare validates a page when it fetches it: it must contain <head>…</head>,
// be under 1.5 MB, carry the page type's required ::TOKEN:: and must not set a
// referrer meta tag. This script enforces those rules plus our own conventions:
// exactly one <h1>, the token in the <p> directly after it, and identical
// boilerplate across every page (only <title>, <h1> and that <p> may differ).

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const DOCS_DIR = "docs";
const MANIFEST = "scripts/pages-manifest.json";
const MAX_BYTES = 1_500_000; // Cloudflare limit

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
delete manifest.$comment;

const files = readdirSync(DOCS_DIR)
  .filter((f) => /^custom-error-.*\.html$/.test(f))
  .sort();

const failures = [];
const fail = (file, message) => failures.push(`${file}: ${message}`);

for (const f of files) if (!manifest[f]) fail(f, `not listed in ${MANIFEST}`);
for (const f of Object.keys(manifest)) {
  if (!files.includes(f)) fail(f, `listed in ${MANIFEST} but missing from ${DOCS_DIR}/`);
}

const skeletons = new Map();

for (const file of files) {
  const fullPath = path.join(DOCS_DIR, file);
  const html = readFileSync(fullPath, "utf8");
  const size = statSync(fullPath).size;
  const expectedTokens = manifest[file]?.tokens ?? [];

  if (size > MAX_BYTES) fail(file, `is ${size} bytes; Cloudflare limit is ${MAX_BYTES}`);
  if (!/<head>[\s\S]*<\/head>/.test(html)) fail(file, "must contain <head>…</head>");
  if (/<meta[^>]+name=["']referrer["']/i.test(html)) {
    fail(file, "contains a referrer meta tag, which breaks Cloudflare challenges");
  }
  if (!/<html[^>]*\blang=/.test(html)) fail(file, "<html> must have a lang attribute");
  if (!/<title>[^<]+<\/title>/.test(html)) fail(file, "must have a non-empty <title>");

  // Pages must be self-contained: no scripts, styles, fonts or images fetched
  // from anywhere (third-party requests from a challenge page leak visitor data,
  // and relative paths 404 when Cloudflare serves the page on thenational.academy).
  // Plain <a href> links are fine.
  const isInline = (ref) => ref.startsWith("data:") || ref.startsWith("#"); // data URIs and in-document SVG ids are fine
  const externalRefs = [
    ...[...html.matchAll(/<(?:script|link|img|iframe|source)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi)].map((m) => m[1]),
    ...[...html.matchAll(/@import\b[^;]*;/gi)].map((m) => m[0]),
    ...[...html.matchAll(/url\(([^)]*)\)/gi)].map((m) => m[1].trim().replace(/^["']|["']$/g, "")),
  ].filter((ref) => !isInline(ref));
  for (const ref of externalRefs) fail(file, `references an external or relative resource: ${ref}`);

  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1Count !== 1) fail(file, `must have exactly one <h1> (found ${h1Count})`);

  const tokens = [...html.matchAll(/::[A-Z0-9_]+::/g)].map((m) => m[0]);
  if (JSON.stringify(tokens) !== JSON.stringify(expectedTokens)) {
    fail(file, `Cloudflare tokens ${JSON.stringify(tokens)} do not match manifest ${JSON.stringify(expectedTokens)}`);
  }

  const contentBlock = html.match(/<h1>[\s\S]*?<\/h1>\s*<p>([\s\S]*?)<\/p>/);
  if (!contentBlock) {
    fail(file, "expected <h1>…</h1> immediately followed by <p>…</p>");
  } else if (!expectedTokens.every((t) => contentBlock[1].includes(t))) {
    fail(file, "the Cloudflare token must sit inside the <p> directly after the <h1>");
  }

  // Everything except the three variable parts must be byte-identical across pages.
  const skeleton = html
    .replace(/<title>[^<]*<\/title>/, "<title>__TITLE__</title>")
    .replace(/<h1>[\s\S]*?<\/h1>\s*<p>[\s\S]*?<\/p>/, "__CONTENT__");
  skeletons.set(file, skeleton);
}

const groups = new Map();
for (const [file, skeleton] of skeletons) {
  groups.set(skeleton, [...(groups.get(skeleton) ?? []), file]);
}
if (groups.size > 1) {
  const [reference, ...outliers] = [...groups.values()].sort((a, b) => b.length - a.length);
  for (const group of outliers) {
    for (const file of group) {
      fail(file, `boilerplate differs from ${reference[0]} — only <title>, <h1> and the following <p> may vary between pages`);
    }
  }
}

if (failures.length) {
  console.error(`✖ ${failures.length} problem(s) in ${files.length} page(s):\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`✔ ${files.length} pages pass the Cloudflare contract and boilerplate parity checks`);
