# static-website-error-pages-2022
Cloudflare static error pages, 2022 rebuild.

The pages can be updated here, then need to be re-imported into Cloudflare in order for changes to be visible to users.

Follow these steps to deploy new or updated custom Cloudflare error pages:

- Make the desired changes to the HTML error page file(s) in the `docs/` directory

- Commit changes to a new branch and open a Pull Request(PR) for review

- Once approved, merge into main branch and verify Deployment by confirming changes are live on [GitHub Pages](https://github.com/oaknational/static-website-error-pages-2022/deployments/github-pages).

- Go to Cloudflare Dashboard → thenational.academy → Error Pages → three dots next to the relevant error page → Fetch custom page again. This pulls the latest HTML into Cloudflare.