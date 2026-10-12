# Final SEO Audit — Lottery Calculator (Phase 10)

**Date:** 2026-10-12 · **Scope:** `dist/` production build (96 pages + 404), plus production crawl of `https://lotterycalculator.site/`.
**Baseline:** Phase 9 technical SEO report (`docs/technical-seo-report.md`) — 0 Critical at Phase 9 close. This audit re-verifies against the final build rather than redoing that work.

## 1. `npm run audit:seo` results (verbatim counts)

```
CRITICAL: 0
WARNING: 9
  - [thin] /404, /contact, /disclaimer (< 300 visible words)
  - [schema] no JSON-LD on /404, /about, /contact, /disclaimer, /privacy, /terms
INFO: 9
  - [pages] 97 HTML pages audited in dist/
  - [orphans] no orphan pages (excluding /404)
  - [depth] max crawl depth from / is 3 (96/97 reachable)
  - [thin] median visible words/page: 1524
  - [near-dup] 0 near-duplicate pairs (Jaccard > 0.9)
  - [registry] 40 literal slugs in src/data/seo-pages.ts; registry <-> dist fully reconciled
  - [sitemap] 96 URLs across 1 sitemap file(s)
  - [redirects] 95 redirect rule(s) in dist/_redirects
SUMMARY: 97 pages audited — 0 critical, 9 warning, 9 info
```

## 2. Metadata uniqueness (independently re-verified)

- Duplicate `<title>`s: **0** (97/97 unique)
- Duplicate first `<h1>`s: **0**; pages missing `<h1>`: **0**
- Canonicals: all present, absolute `https://lotterycalculator.site/...`, path-matching (per Phase 9 audit; unchanged since)
- robots meta: `index, follow` on all 96 pages; `/404/` carries noindex — correct

## 3. Sitemap vs dist reconciliation

- `dist/sitemap-index.xml` → `sitemap-0.xml`: **96 `<loc>` entries**
- `dist/` HTML pages: 96 (+ `/404.html`, correctly excluded from sitemap)
- Registry ↔ dist: fully reconciled (audit INFO flag)
- **Match: 96 = 96. No sitemap skew.**

## 4. Redirects sanity

- `dist/_redirects`: 95 rules — one trailing-slash 301 per route for every route except `/` (which is the origin)
- Live check: `/powerball` → 301 → `https://lotterycalculator.site/powerball/` ✓
- `docs/WORKER-REDIRECT.md` documents the legacy-host redirect (gtag-adjacent inline redirect in Layout head); no conflicts observed

## 5. Orphans / depth / thin / duplicates

- Orphans: **none** (excluding `/404`, which is intentionally unlinked)
- Max BFS depth from `/`: **3** — homepage (0) → hubs (1) → calculators (1–2) → state/amount sub-pages (2–3). Shallow and crawl-friendly.
- Thin (< 300 visible words): `/404`, `/contact`, `/disclaimer` — all utility pages; accepted
- Near-duplicates (Jaccard > 0.9): **0** pairs, including across the 51 state tax pages and 5 amount payout pages
- Median visible words/page: **1524**

## 6. Schema coverage

- JSON-LD present on **91/97** HTML files
- Missing on 6 utility pages only (`/404`, `/about`, `/contact`, `/disclaimer`, `/privacy`, `/terms`) — deliberately no invented schema
- Open Graph tags (`og:title`): **97/97**

## 7. Indexability

- 96/96 content pages indexable (`index, follow`); only `/404/` noindexed
- robots.txt: `Allow: /`, sitemap reference present and correct
- Security headers (`_headers`): HSTS, X-Frame-Options DENY, nosniff — live in build; CSP intentionally omitted (inline-script calculators; documented in-file)

## 8. Production crawl results (2026-10-12, curl)

| URL | Status | Notes |
|---|---|---|
| `/` | 200 | title + canonical + `index, follow` match dist |
| `/lottery-calculator/` | 200 | matches dist |
| `/powerball/` | 200 | matches dist |
| `/learn/` | 200 | matches dist |
| `/methodology/` | 200 | matches dist |
| `/sources/` | 200 | Phase 9 page LIVE; byte-identical to dist (26,568 B) |
| `/lottery-tax-calculator/` | 200 | matches dist |
| `/mega-millions/` | 200 | matches dist |
| `/sitemap-index.xml` | 200 | live sitemap has 96 URLs incl. `/sources/` — matches dist |
| `/robots.txt` | 200 | matches dist |
| `/llms.txt` | 200 | live |
| `/66210dc976255bb98bba2a029ccdece9.txt` | 200 | IndexNow key file LIVE (key body `66210dc976255bb98bba2a029ccdece9`) |
| `/this-page-does-not-exist-xyz/` | 404 | proper 404 status + custom 404 page |
| `/powerball` (no slash) | 301 → `/powerball/` | trailing-slash rule working |

**No BLOCKED fetches. No errors.**

## 9. Version skew (local dist vs production)

**No skew found.** Firoz has deployed the Phase 9 build:
- `/sources/` (added in Phase 9) returns 200 live and is byte-identical to `dist/sources/index.html`
- IndexNow key URL returns 200 live with the correct key body (the Phase 9 note said it needed a manual deploy — that deploy has happened)
- Live sitemap (96 URLs) matches dist sitemap exactly; live robots.txt matches dist
- Homepage title/canonical live = dist

Note: IndexNow re-submission was the documented post-deploy step — that is a parent/orchestrator call, not re-audited here.

## 10. Findings — P classification

| P | Finding | Notes |
|---|---|---|
| P1 | IndexNow re-submit after the now-confirmed deploy | Deploy happened; re-submission is the pending follow-up (parent scope) |
| P3 | Thin utility pages (`/contact`, `/disclaimer`) | Accepted by design; no action |
| P3 | No JSON-LD on 6 utility pages | Deliberate (no invented schema); no action |
| P3 | No CSP header | Documented trade-off (inline calculator scripts); revisit only if scripts are extracted; no action |

**P0: none. P2: none.**

## Verdict

Site is SEO-clean at final build: 0 Critical, metadata fully unique, sitemap↔dist reconciled, no orphans, max depth 3, 91/97 schema coverage (100% of content pages), production fully in sync with dist. Nothing in this audit requires a code change. Remaining item is operational (IndexNow re-submit), not a defect.

*Companion artifact: [`final-route-matrix.csv`](final-route-matrix.csv) — 97 rows, one per route.*
