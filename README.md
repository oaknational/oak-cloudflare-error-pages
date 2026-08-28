# static-website-error-pages

Oak's custom Cloudflare error and challenge pages for `thenational.academy`.

Cloudflare fetches each page from this repo's GitHub Pages site — `https://oaknational.github.io/static-website-error-pages/<file>.html`, published from `docs/` on `main` — and then serves its own cached copy. Changes here are therefore only visible to users once Cloudflare re-fetches the page.

## Updating a page

- Edit the HTML file(s) in `docs/`.
- Commit to a branch and open a Pull Request for review.
- Merge into `main` and confirm the deploy on [GitHub Pages](https://github.com/oaknational/static-website-error-pages/deployments/github-pages).
- Make Cloudflare re-fetch the page — either apply the Cloud-Config `cloudflare-misc` workspace (see below; an apply re-fetches every page), or in the Cloudflare dashboard: thenational.academy → Error Pages → three dots next to the page → **Fetch custom page again**.

## Wiring: which page serves which error

The mapping from Cloudflare error-page type to URL is Terraform in [Cloud-Config](https://github.com/oaknational/Cloud-Config): `infrastructure/cloudflare/misc/custom_pages.tf` (`local.custom_pages`, one `{ type, url }` entry per page). To add a page: add the HTML here and merge, then add an entry there and apply. Cloudflare validates that the required token (below) is present when it fetches the page.

## Pages

There is no template or build step: every file in `docs/` is a self-contained copy of the same layout. When adding a page, copy an existing one and change only the `<title>`, `<h1>` and the `<p>` holding the Cloudflare token. Pages must stay under 1.5 MB, contain `<head>…</head>`, and must **not** include a `referrer` meta tag (it breaks challenges).

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
npm run collapsify -- -o out.html https://oaknational.github.io/static-website-error-pages/custom-error-500.html
```
