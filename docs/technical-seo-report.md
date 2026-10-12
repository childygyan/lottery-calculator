# Technical SEO Report — lotterycalculator.site

**Date:** 2026-10-12 · **Scope:** `dist/` production build (96 pages + 404)

## 1. Baseline

| Metric | Value |
|---|---|
| HTML pages | 96 (+ `/404.html`) |
| Total dist size | ~3.5 MB |
| Client JS | 59.4 KB across 13 files (`dist/_astro/`); per-page ~10–25 KB |
| CSS | 43.9 KB, 2 files (render-blocking but small) |
| Images | 3 (`favicon.svg`, `og-image.svg`, `firoz-khan.webp` → resized 26.4 KB → 2.7 KB) |
| Webfonts | 0 (system stack only) |
| Sitemap URLs | 96 |
| Redirect rules | 95, 0 problems |

## 2. Crawl results (`npm run audit:seo`)

- **Critical: 0.** No missing/duplicate H1s, no broken internal links, all canonicals absolute `https://lotterycalculator.site/...` and path-matching, registry ↔ dist fully reconciled, sitemap valid.
- **Warnings (9, accepted):** thin `/404`, `/contact`, `/disclaimer` (utility pages); no JSON-LD on `/404`, `/about`, `/contact`, `/disclaimer`, `/privacy`, `/terms` (no fake schema invented).
- Orphans: 0 (excl. /404). Max crawl depth: 3. Near-duplicate pairs: 0. Median words/page: 1524.

## 3. Performance

- **Architecture:** static-first, fully pre-rendered HTML. 11 client scripts, all vanilla `type="module"` (deferred, non-blocking); zero framework hydration. GA snippet is `async`.
- **Core Web Vitals:** no render-blocking JS; single below-fold `<img>` already lazy with dimensions; no layout-shift risks.
- **Fix applied:** `firoz-khan.webp` 1080×1080 → 192×192 (displayed at 96px), 26.4 KB → 2.7 KB.

## 4. Accessibility (WCAG 2.2 AA)

- Already good: skip link, `lang="en"`, 0 unlabeled controls, fieldset/legend on radios, `aria-live="polite"` on all result regions, `role="alert"` + focus management on errors, `aria-describedby` wiring, table scope/caption, `:focus-visible` outlines, 48px touch targets, all contrast ≥ 4.5:1, decorative SVGs `aria-hidden`, named icon buttons, `noopener noreferrer` on external links.
- **Fixed (Medium):** h1→h3 heading skip on 4 pages (OddsCalculator + ProbabilityExplorer results headings demoted to h2, no visual change).
- **Fixed (Low):** `aria-describedby` added to hand-written selects in LotteryCalculator/PayoutCalculator.
- **Left:** `placeholder-slate-400` contrast (supplementary, every field labeled — not a failure); no `prefers-reduced-motion` on smooth scroll (cosmetic).

## 5. Security

- **Input handling:** single `URLSearchParams` use (`?amount=` prefill) goes through `parseShareableAmount()` (strips non-numerics, range-checked, assigned via `.value`). No `eval()`, no `javascript:` URLs, no `document.write`. All `innerHTML` renders validated numbers only; user strings via `textContent`. `set:html` renders server-side JSON-LD only. Errors via `textContent`; no stack traces leak.
- **Secrets:** repo-wide grep — zero hits; no `.env` files. (GA4 ID + IndexNow key filename are public by design.)
- **Dependencies:** `npm audit` blocked by environment proxy (403) — manual CVE review substituted. Astro 5.18.2 already ≥ 5.18.1 (only applicable low CVE already patched); remaining astro CVEs are dev-server/adapter-only, N/A for this static build. No package changes needed.
- **Headers:** `public/_headers` → `dist/_headers`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, HSTS with preload. **CSP intentionally omitted** (documented in-file): inline calculator scripts would break under a strict CSP; `unsafe-inline` would make it worthless.

## 6. E-E-A-T / Trust

| Page | Exists | Linked | Accurate |
|---|---|---|---|
| `/about/` | ✓ | footer | Firoz Khan / FK Digital Media, real socials |
| `/methodology/` | ✓ | footer + llms.txt | engines/sources grounded, WV flag honest |
| `/sources/` | ✓ **new** | footer | 11 registry sources in 4 sections + methodology mapping |
| `/contact/` | ✓ | footer | contact@lotterycalculator.site |
| `/privacy/` | ✓ | footer | live GA4 disclosed, opt-out linked |
| `/terms/` | ✓ | footer | estimates-only, operator identity |

No fake reviews/ratings/testimonials/credentials anywhere; no Review/AggregateRating schema.

## 7. Findings by severity

- **Critical: 0.** **High: 0.** **Medium: 1** (heading order — fixed). **Low: 2** (aria-describedby — fixed; placeholders — accepted).
- Nothing further practical to fix; remaining warnings are accepted utility-page characteristics.
