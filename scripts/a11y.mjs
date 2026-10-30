#!/usr/bin/env node
// Accessibility check: runs axe-core (WCAG 2.0/2.1/2.2 A + AA rules) against
// every page in docs/ at a desktop and a mobile viewport, driving Chromium via
// Playwright. Pages are opened straight from disk: check-pages guarantees they
// load nothing external or relative, so a local server would add nothing.

import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, devices } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const DOCS_DIR = "docs";
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

const viewports = {
  desktop: { viewport: { width: 1280, height: 900 } },
  mobile: devices["iPhone 13"],
};

const files = readdirSync(DOCS_DIR)
  .filter((f) => /^custom-error-.*\.html$/.test(f))
  .sort();

const browser = await chromium.launch();
let failed = 0;

for (const [name, device] of Object.entries(viewports)) {
  const context = await browser.newContext(device);
  for (const file of files) {
    const page = await context.newPage();
    await page.goto(pathToFileURL(path.resolve(DOCS_DIR, file)).href, { waitUntil: "networkidle" });
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

if (failed) {
  console.error(`\n✖ ${failed} page/viewport combination(s) have accessibility violations`);
  process.exit(1);
}
console.log(`\n✔ ${files.length} pages × ${Object.keys(viewports).length} viewports pass axe (WCAG 2.2 AA + best practices)`);
