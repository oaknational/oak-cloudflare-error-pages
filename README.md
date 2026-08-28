# static-website-error-pages-2022
Cloudflare static error pages, 2022 rebuild.

The pages can be updated here, then need to be re-imported into Cloudflare in order for changes to be visible to users.

Follow these steps to deploy new or updated custom Cloudflare error pages:

- Make the desired changes to the HTML error page file(s) in the `docs/` directory

- Commit changes to a new branch and open a Pull Request(PR) for review

- Once approved, merge into main branch and verify Deployment by confirming changes are live on [GitHub Pages](https://github.com/oaknational/static-website-error-pages-2022/deployments/github-pages).

- Go to Cloudflare Dashboard → thenational.academy → Error Pages → three dots next to the relevant error page → Fetch custom page again. This pulls the latest HTML into Cloudflare.

To wire up a **new** page for the first time: Error Pages → three dots next to the error type → Edit → select **Custom page** → paste the page's GitHub Pages URL (`https://oaknational.github.io/static-website-error-pages-2022/<file>.html`) → Save. Cloudflare validates that the required token (below) is present when it fetches the page.

## Pages

There is no template or build step: every file in `docs/` is a self-contained copy of the same layout. When adding a page, copy an existing one and change only the `<title>`, `<h1>` and the `<p>` holding the Cloudflare token. Pages must stay under 1.5 MB, contain `<head>…</head>`, and must **not** include a `referrer` meta tag (it breaks challenges).

| File | Cloudflare error page type (API id) | Required token |
| --- | --- | --- |
| `custom-error-500.html` | 500 class errors (`500_errors`) | `::CLOUDFLARE_ERROR_500S_BOX::` |
| `custom-error-1000.html` | 1000 class errors (`1000_errors`) | `::CLOUDFLARE_ERROR_1000S_BOX::` |
| `custom-error-always-online.html` | Always Online | `::ALWAYS_ONLINE_NO_COPY_BOX::` |
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
