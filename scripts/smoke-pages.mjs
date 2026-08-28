#!/usr/bin/env node
// Post-deploy smoke test: waits until GitHub Pages serves exactly the committed
// version of every page in docs/. Run after a push to main; the Pages build
// happens asynchronously, so this polls until the live bytes match or a
// timeout is hit. Cloudflare fetches pages from this origin, so a broken publish
// here would be picked up on the next "fetch custom page".

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const DOCS_DIR = "docs";
const BASE_URL = (process.env.PAGES_BASE_URL ?? "https://oaknational.github.io/oak-cloudflare-error-pages").replace(/\/$/, "");
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 10 * 60_000);
const INTERVAL_MS = 15_000;

const files = readdirSync(DOCS_DIR)
  .filter((f) => /^custom-error-.*\.html$/.test(f))
  .sort();

const pending = new Map(files.map((f) => [f, readFileSync(path.join(DOCS_DIR, f), "utf8")]));
const deadline = Date.now() + TIMEOUT_MS;

console.log(`Waiting for ${files.length} pages on ${BASE_URL} (timeout ${TIMEOUT_MS / 1000}s)…`);

while (pending.size && Date.now() < deadline) {
  for (const [file, expected] of pending) {
    try {
      const res = await fetch(`${BASE_URL}/${file}`, { cache: "no-store", headers: { "cache-control": "no-cache" } });
      if (res.status === 200 && (await res.text()) === expected) {
        console.log(`✔ ${file}`);
        pending.delete(file);
      }
    } catch {}
  }
  if (pending.size) await new Promise((r) => setTimeout(r, INTERVAL_MS));
}

if (pending.size) {
  console.error(`\n✖ ${pending.size} page(s) not serving the committed content after ${TIMEOUT_MS / 1000}s:`);
  for (const file of pending.keys()) console.error(`  - ${BASE_URL}/${file}`);
  process.exit(1);
}
console.log(`\n✔ all ${files.length} pages live and matching the committed files`);
