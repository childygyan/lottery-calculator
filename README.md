# Lottery Calculator

Estimate federal and state taxes on U.S. lottery winnings — and see the
estimated take-home amount for lump-sum (cash) or annuity payouts.

**Production:** https://lotterycalculator.site · **96 pages** · Astro 5,
strict TypeScript, Tailwind CSS. No frameworks ship to the browser: one small
vanilla-TS bundle (~13 kB raw) powers the interactive calculators.

## Features

- **Lottery winnings calculator** — jackpot + cash option, all 50 states + DC
- Powerball & Mega Millions tools: tax, payout, annuity, odds, number generators
- **Tax-year architecture** — currently **2026**; new years plug in as data files
- **Filing statuses** — single, married filing jointly/separately, head of household
- **Withholding vs. liability** — 24% federal withholding shown separately and
  credited against the estimated final tax, never added to it
- **Annuity mode** — 30-year equal-payment estimates
- `/learn/` hub with lottery guides (odds, payouts, taxes, combinations)
- `/sources/` page — every tax rule carries a source, effective date, and
  `verified` / `needs_verification` status; unverified figures are never shown

## Development

```bash
npm ci
npm run dev        # local dev server
npm run check      # strict TypeScript
npm test           # unit tests (319)
npm run build      # production build → dist/  (postbuild: redirects + duplicate-meta checks)
npm run test:dom   # built-DOM smoke tests (needs build first)
npm run preview    # serve the production build
```

## SEO & operations

- `npm run audit:seo` — full SEO audit (0 Critical expected); gates releases
- `npm run indexnow` — submits sitemap URLs to IndexNow; key file is
  `public/66210dc976255bb98bba2a029ccdece9.txt` (must be live before submitting)
- `public/_headers` — production security headers (CSP intentionally omitted;
  see the file's note)
- GA4 (`G-HEF85ZBF99`) + Google Search Console verification in
  `src/layouts/Layout.astro`
- Key scripts in `scripts/`: `audit-seo.mjs`, `submit-indexnow.mjs`,
  `build-redirects.mjs`, `check-duplicate-meta.mjs`, `audit-lottery-pages.mjs`,
  `audit-state-pages.mjs`, `audit-odds-pages.mjs`, `audit-generator-pages.mjs`
- Phase reports in `docs/PHASE<n>-REPORT.md`; `docs/technical-seo-report.md`;
  `docs/WORKER-REDIRECT.md` (workers.dev → production 301 snippet)

## Tax data

- `src/data/taxes/federal/<year>.ts` — IRS brackets, standard deductions, withholding
- `src/data/taxes/states/<year>.ts` — per-state planning rates with provenance
- `src/data/sources.ts` — central source registry
- `src/data/site.ts` — site name, production URL, contact email (single source)

All figures are **planning estimates**, not tax advice. See `/disclaimer/`.

## Deployment (manual)

Deployment is **manual, by Firoz** — no CI/CD. Build locally, upload `dist/`
to the Cloudflare Worker as static assets, attach the custom domain, then run
post-deploy checks. Full procedure: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## License

Private project — all rights reserved.
