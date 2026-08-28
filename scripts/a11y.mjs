#!/usr/bin/env node
// Accessibility check: runs axe-core (WCAG 2.0/2.1/2.2 A + AA rules) against
// every page in docs/ at a desktop and a mobile viewport, serving docs/ locally
// and driving Chromium via Playwright.

import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { chromium, devices } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const DOCS_DIR = "docs";
const PORT = Number(process.env.PORT ?? 3111);
const BASE = `http://127.0.0.1:${PORT}`;
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

const viewports = {
  desktop: { viewport: { width: 1280, height: 900 } },
  mobile: devices["iPhone 13"],
};

const files = readdirSync(DOCS_DIR)
  .filter((f) => /^custom-error-.*\.html$/.test(f))
  .sort();

const server = spawn("node_modules/.bin/serve", [DOCS_DIR, "-l", String(PORT), "--no-clipboard", "--no-port-switching"], {
  stdio: "ignore",
});
const stopServer = () => server.kill("SIGTERM");
process.on("exit", stopServer);

const started = Date.now();
while (true) {
  try {
    if ((await fetch(`${BASE}/${files[0]}`)).ok) break;
  } catch {}
  if (Date.now() - started > 20_000) {
    console.error(`✖ local server on ${BASE} did not start`);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 250));
}

const browser = await chromium.launch();
let failed = 0;

for (const [name, device] of Object.entries(viewports)) {
  const context = await browser.newContext(device);
  for (const file of files) {
    const page = await context.newPage();
    await page.goto(`${BASE}/${file}`, { waitUntil: "networkidle" });
    const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    await page.close();

    const label = `${file} @ ${name}`;
    if (violations.length === 0) {
      console.log(`✔ ${label}`);
      continue;
    }
    failed++;
    console.error(`✖ ${label}: ${violations.length} violation(s)`);
    for (const v of violations) {
      console.error(`    [${v.id}] (${v.impact}) ${v.help} — ${v.helpUrl}`);
      for (const node of v.nodes.slice(0, 3)) console.error(`      ${node.target.join(" ")}`);
    }
  }
  await context.close();
}

await browser.close();
stopServer();

if (failed) {
  console.error(`\n✖ ${failed} page/viewport combination(s) have accessibility violations`);
  process.exit(1);
}
console.log(`\n✔ ${files.length} pages × ${Object.keys(viewports).length} viewports pass axe (WCAG 2.2 AA + best practices)`);
