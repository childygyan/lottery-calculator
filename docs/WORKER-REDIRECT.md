# Redirect workers.dev → lotterycalculator.site (proper 301)

The site already redirects visitors from the legacy staging hostname
(`lottery-calculator.childygyan.workers.dev`) to the production domain via a
tiny script in `src/layouts/Layout.astro`. That works immediately after every
deploy.

For the SEO-correct permanent redirect, add this to the **Worker code**
(Cloudflare dashboard → Workers & Pages → `lottery-calculator` → Edit code).
It 301-redirects any request on the old hostname, preserving path and query
string, and serves assets normally on the production domain:

```js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "lottery-calculator.childygyan.workers.dev") {
      url.hostname = "lotterycalculator.site";
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
```

Notes:

- This assumes the Worker serves the static site through the `ASSETS`
  binding (the standard Workers Static Assets setup). If your worker code
  looks different, keep its existing asset-serving line and only add the
  `if` block at the top of `fetch`.
- Once the 301 is live in the Worker, the inline script in `Layout.astro`
  becomes a harmless no-op fallback (it only fires on the old hostname,
  which will then never serve HTML).
- Also add `lotterycalculator.site` as a **custom domain** on the Worker
  (Workers & Pages → `lottery-calculator` → Settings → Domains & Routes →
  Add custom domain) after pointing the domain's DNS to Cloudflare.
