# Oak Cloudflare error pages

Oak's custom Cloudflare error and challenge pages for `thenational.academy`.

Cloudflare fetches each page from this repo's GitHub Pages site — `https://oaknational.github.io/oak-cloudflare-error-pages/<file>.html`, published from `docs/` on `main` — and then serves its own cached copy. Changes here are therefore only visible to users once Cloudflare re-fetches the page.

## Updating a page

- Edit the HTML file(s) in `docs/`.
- Commit to a branch and open a Pull Request for review.
- Merge into `main` and confirm the deploy on [GitHub Pages](https://github.com/oaknational/oak-cloudflare-error-pages/deployments/github-pages).
- Make Cloudflare re-fetch the page — either apply the Cloud-Config `cloudflare-misc` workspace (see below; an apply re-fetches every page), or in the Cloudflare dashboard: thenational.academy → Error Pages → three dots next to the page → **Fetch custom page again**.

## Wiring: which page serves which error

The mapping from Cloudflare error-page type to URL is Terraform in [Cloud-Config](https://github.com/oaknational/Cloud-Config): `infrastructure/cloudflare/misc/custom_pages.tf` (`local.custom_pages`, one `{ type, url }` entry per page). To add a page: add the HTML here and merge, then add an entry there and apply. Cloudflare validates that the required token (below) is present when it fetches the page.

## Pages

There is no template or build step: every file in `docs/` is a self-contained copy of the same layout. When adding a page, copy an existing one and change only the `<title>`, `<h1>` and the `<p>` holding the Cloudflare token. Pages must stay under 1.5 MB, contain `<head>…</head>`, and must **not** include a `referrer` meta tag (it breaks challenges).

Pages make **no external requests**: the Lexend font (SIL OFL, variable weight) and the favicons are inlined as data URIs — the source files live in `src/assets/` — and the only script is two inline lines that set the copyright year. This matters because Cloudflare serves the page on `thenational.academy`, where relative paths 404 and third-party requests from a challenge page would leak visitor data. The pages carry `<meta name="robots" content="noindex, nofollow">` and `docs/robots.txt` disallows crawling of the Pages origin.

| File | Cloudflare error page type (API id) | Required token |
| --- | --- | --- |
| `custom-error-500.html` | 500 class errors (`500_errors`) | `::CLOUDFLARE_ERROR_500S_BOX::` |
| `custom-error-1000.html` | 1000 class errors (`1000_errors`) | `::CLOUDFLARE_ERROR_1000S_BOX::` |
| `custom-error-always-online.html` | Always Online (type no longer offered by Cloudflare; kept for reference) | `::ALWAYS_ONLINE_NO_COPY_BOX::` |
| `custom-error-geo-block.html` | IP/Country block (`ip_block`) | none (`::GEO::` is present but not required) |
| `custom-error-under-attack.html` | IP/Country challenge (`country_challenge`) | `::CAPTCHA_BOX::` |
| `custom-error-waf-challenge.html` | Interactive / Managed challenge (`basic_challenge`, `managed_challenge`) | `::CAPTCHA_BOX::` |
| `custom-error-non-interactive-challenge.html` | Non-interactive (JS) challenge / I'm Under Attack Mode (`under_attack`) | `::IM_UNDER_ATTACK_BOX::` |
| `custom-error-waf-block.html` | WAF block (`waf_block`) | none |
| `custom-error-rate-limit.html` | Rate limiting block (`ratelimit_block`) | none |

The API id and required token for each type can be confirmed with `GET /zones/{zone_id}/custom_pages`.

## Checks

Every pull request runs the **Pages checks** workflow (`.github/workflows/pages-checks.yml`); run the same locally with `npm test` after `npm install`:

| Command | What it checks |
| --- | --- |
| `npm run check:pages` | The Cloudflare contract for every page in `docs/`: `<head>…</head>` present, under 1.5 MB, no `referrer` meta, exactly one `<h1>`, the page's `::TOKEN::` (from `scripts/pages-manifest.json`) sitting in the `<p>` directly after the `<h1>`, no external or relative resources (scripts, styles, fonts, images must be inline/data URIs) — and that all pages share byte-identical boilerplate apart from `<title>`, `<h1>` and that `<p>`. |
| `npm run lint:html` | HTML validity via [html-validate](https://html-validate.org/) (`.htmlvalidate.json`). |
| `npm run test:a11y` | WCAG 2.2 A/AA + best-practice rules via [axe-core](https://github.com/dequelabs/axe-core) (driven by Playwright) on every page at a desktop (1280px) and a mobile (iPhone 13) viewport. Run `npx playwright install chromium` once first. |

When you add a page, add it to `scripts/pages-manifest.json` too (file → Cloudflare type(s) → required tokens) or `check:pages` fails.

After every push to `main`, the **Pages smoke test** workflow (`npm run smoke`) polls the live GitHub Pages origin until each page serves exactly the committed file, so a broken publish is caught before Cloudflare's next fetch.

## Local preview

```sh
python3 -m http.server 3000 -d docs
# then open http://localhost:3000/custom-error-500.html
```

Or, with the npm tooling (`npm install` first):

```sh
npm run serve                      # serves docs/ on http://localhost:3000
# inline a page's external assets into a single self-contained file
# (collapsify refuses localhost/private URLs by default; pass -x '^$' to allow them)
npm run collapsify -- -o out.html https://oaknational.github.io/oak-cloudflare-error-pages/custom-error-500.html
```
