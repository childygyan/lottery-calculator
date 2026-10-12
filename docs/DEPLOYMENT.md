# Deployment — Lottery Calculator

**Deployment is MANUAL, done by Firoz.** There is no CI/CD pipeline and no
auto-deploy from GitHub. Every production deploy follows the steps below.

- **Production:** https://lotterycalculator.site
- **Worker:** `lottery-calculator` (Cloudflare Workers & Pages)
- **Legacy staging hostname:** `lottery-calculator.childygyan.workers.dev`
  (301-redirects to production once the Worker snippet in
  `docs/WORKER-REDIRECT.md` is installed; an inline fallback script in
  `src/layouts/Layout.astro` also redirects clients from the old hostname)

## 1. Prerequisites

- Cloudflare account with access to the `lottery-calculator` Worker
- Domain `lotterycalculator.site` registered and its DNS managed in
  Cloudflare (nameservers or zone active)
- Local checkout of this repo with Node.js (see `package.json` engines / lockfile)

## 2. Build

```bash
npm ci            # clean, reproducible install
npm run check     # strict TypeScript — must pass
npm test          # 319 unit tests — must pass
npm run build     # → dist/  (postbuild also runs redirect + duplicate-meta checks)
```

Optional but recommended before a production deploy:

```bash
npm run audit:seo # full SEO audit — 0 Critical expected
```

## 3. Deploy

1. **Upload `dist/`** to the `lottery-calculator` Cloudflare Worker as
   **static assets** (Workers & Pages → `lottery-calculator` → dashboard).
2. **Attach the custom domain:** Workers & Pages → `lottery-calculator` →
   **Settings → Domains & Routes → Add custom domain** →
   `lotterycalculator.site`.
3. **DNS:** ensure `lotterycalculator.site` (and `www`, if used) points to the
   Worker — Cloudflare-managed DNS, proxied records.
4. **Key file check:** confirm
   `https://lotterycalculator.site/66210dc976255bb98bba2a029ccdece9.txt`
   returns **200** — the IndexNow key must be live *before* submitting.

## 4. Post-deploy

1. **workers.dev → production 301** (Firoz's step — dashboard only):
   Cloudflare → Workers & Pages → `lottery-calculator` → **Edit code**,
   paste the snippet from `docs/WORKER-REDIRECT.md`. Verify:
   `https://lottery-calculator.childygyan.workers.dev/` → **301** to
   `https://lotterycalculator.site/`.
2. **IndexNow:** with the key URL returning 200, run `npm run indexnow`
   (submits all sitemap URLs; expect 202 Accepted).
3. **Search Console:** submit `https://lotterycalculator.site/sitemap-index.xml`.
4. **GA4:** open the production site and confirm a real-time hit registers in
   GA4 (`G-HEF85ZBF99`).

## 5. First-24-hours checklist

- [ ] DNS propagation complete for `lotterycalculator.site` (apex, and `www`
      if used) — check from more than one network
- [ ] `https://lotterycalculator.site/` returns **200**; HTTP → HTTPS
      redirect works
- [ ] Custom 404 page: a bogus URL (e.g. `/does-not-exist/`) serves
      `404.html` with a **404** status and noindex (Workers static assets
      serve `404.html` automatically — verify the status code, not just the page)
- [ ] Key calculators smoke test: `/lottery-calculator/`,
      `/lottery-tax-calculator/`, `/powerball-calculator/`,
      `/mega-millions-calculator/`, `/lottery-odds-calculator/` — form
      submits, results render
- [ ] GA4 real-time shows traffic from the production domain
- [ ] Sitemap submitted in Search Console
- [ ] No mixed-content warnings (browser console clean)

## 6. 7-day checklist

- [ ] Indexation started — Search Console shows pages indexed (or at least
      crawled)
- [ ] No crawl errors in Search Console
- [ ] workers.dev legacy hostname 301 still in place and preserving
      path/query strings
- [ ] Core Web Vitals **field data**, if available yet in Search Console /
      CrUX
- [ ] GA4 collecting sessions with no anomalies (traffic source, bounce
      sanity check)

## 7. 30-day checklist

- [ ] Review rankings / impressions in Search Console; note any pages with
      impressions but no clicks (meta/title tuning candidates)
- [ ] Review thin pages — any page with zero impressions and no business
      value is a candidate for consolidation
- [ ] **Re-verify lottery rules:** if Powerball, Mega Millions, or a state
      tax law changed a drawing or rate, update `src/data/` and redeploy
      (tax-year 2026 files are the current source of truth)
- [ ] Dependency patch review: `npm outdated` / audit advisories; patch only
      what is safe for a static site (no new features in a maintenance pass)
- [ ] Re-run `npm run audit:seo` and confirm 0 Critical

## 8. Rollback

Keep the previous deploy's `dist/` (or a dated zip of it) before every
upload. To roll back, re-upload the last-good `dist/` to the Worker — the
site is fully static, so rollback is just another upload. Verify the key
file URL and a calculator page after rollback.
