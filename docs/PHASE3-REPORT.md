# Lottery Calculator — Phase 3 Report

**Date:** 2026-09-28
**Scope:** Programmatic SEO + state lottery tax calculator pages (§1–§6 of the Phase 3 spec)
**Constraint honored:** No rebuild. All work extends the Phase 2 Astro 5 + strict TypeScript + Tailwind v3 codebase.

---

## What was built

### 1. Routes — 52 new static pages, one dynamic file
- `src/pages/lottery-tax-calculator/index.astro` — hub with H1 "Lottery Tax Calculator", interactive calculator, how-taxes-work / federal-vs-state / cash-vs-annuity explainers, filterable A–Z state directory (51 entries, vanilla-JS filter), hub FAQs, methodology, disclaimer.
- `src/pages/lottery-tax-calculator/[state].astro` — single dynamic route with `getStaticPaths()` from centralized state data. **Exactly 51 jurisdiction paths generated** (50 states + DC). Invalid slugs fall through to Astro's normal 404 (no route generated).
- No manually duplicated route files. Build output: **60 pages total** (8 Phase 1/2 + 52 new).

### 2. State page content (`src/data/states/`)
- `content.ts` — per-state page content: intro, tax explanation, withholding explanation, cash-vs-annuity notes, 4–6 state FAQs, meta description. Templates keyed by treatment (no-income-tax / California exemption / ordinary-income / needs-verification).
- `related.ts` — central neighbor mapping for all 51 slugs (e.g., CA → OR/NV/AZ; TX → OK/LA/AR/NM; NY → NJ/PA/CT/MA).
- `index.ts` — barrel.
- **Honesty rules enforced:** WV (`needs_verification`) shows "Calculation unavailable with current verified data." and the exact notice "State-specific tax information is currently marked for verification. See the cited source information before relying on the estimate." No unverified percentage is shown as confirmed; no numeric state-tax example is rendered for WV; no silent `$0` substitution.
- **Neighbor contrast:** every verified state's tax explanation ends with one data-grounded sentence contrasting its treatment with verified neighbors' (e.g., "Cross the border and the deal changes: Oregon (9.90%) and Idaho (5.3%) tax lottery winnings as ordinary income."). Derived from the same dataset — nothing researched per page, nothing invented. This also guarantees state-specific sections genuinely vary (duplicate-content audit: 51 distinct signatures).
- **Examples:** $1M / $10M / $100M jackpots through the real engine (single filer, lump sum, 2026). Cash value assumed at **48% of jackpot, labeled as an illustrative assumption** on every page. Verified numbers spot-checked: CA $1M → $480K − $131,134 federal − $0 state = $348,866 take-home; NY $1M → $296,546.

### 3. Components
- `StateTaxSummary.astro` — state, tax year, treatment, applicable tax, verified withholding (none currently configured as verified → honest "not shown" fallback), last-verified date; unverified notice for WV.
- `SourceList.astro` — renders the source registry; links only for verified URLs, names otherwise.
- `LotteryCalculator.astro` + `StateSelect.astro` now accept `defaultState` — state pages preselect their state; user can still change it.
- Navigation (`src/data/navigation.ts`): hub added to main + footer nav.

### 4. SEO per state page
- Exactly one H1: "{State} Lottery Tax Calculator".
- Unique title: "{State} Lottery Tax Calculator — Estimate Your Take-Home Winnings".
- Natural state-specific meta description (100–170 chars).
- State-specific OG tags; self-canonical from central `siteUrl`; no `noindex`.
- Breadcrumb Home → Lottery Tax Calculator → {State}, with matching BreadcrumbList JSON-LD.
- Visible FAQs exactly match FAQPage schema.
- Sitemap contains hub + all 51 state pages exactly once; robots.txt references the sitemap index.

### 5. Audit script (`scripts/audit-state-pages.mjs`)
Checks all 52 generated pages: route count, H1 count, title/description/canonical/OG, breadcrumb + JSON-LD, preselected state, all-51-options, state name in body, 3-row example table, no `undefined`/`null`/placeholder/localhost leaks, all internal links resolve, sitemap coverage + no duplicates, duplicate-content signatures, related-states nav (2–5 links, no self-links).

---

## Verification

| Check | Result |
|---|---|
| Strict TypeScript (`tsc --noEmit`) | 0 errors |
| Unit + built-DOM tests | **90/90 pass** (76 Phase 2 + 14 new) |
| Astro build | Clean, 60 pages |
| Generated-output audit (`scripts/audit-state-pages.mjs`) | **52/52 pages, 0 failures, 0 warnings** |
| Internal links | 61 unique, 0 broken |
| Sitemap | 59 URLs; all 52 lottery-tax pages present exactly once |
| Duplicate content | 51 distinct state-content signatures |
| Accessibility scan (52 pages) | 0 issues (labels, alt, viewport, lang, main landmark) |
| Client bundle | 13.9 kB raw / **5.2 kB gzip** (Phase 2: 13.5/5.2 — filter adds ~0.4 kB raw) |
| Invalid slugs | No route generated → Astro 404 |

**New tests (14):** 11 unit (`tests/state-pages.test.ts`: 51 contexts, slug uniqueness/validity, related mapping coverage 2–5/real-slugs/no-self, content for every jurisdiction, WV honesty, CA exemption, no-tax reason wording, neighbor-contrast uniqueness, example constants) + 3 built-DOM (`tests/dom.test.ts`: preselected state + 52 options on CA/TX/NY pages, WV unavailable notices, hub filter + 51 directory links).

**Test honesty note:** WV's content assertions check for *presence* of verification language, never the unpublished rate value.

---

## Known limitations (carried from Phase 2, unchanged)
- `siteUrl` is still the placeholder `https://lotterycalculator.example.com` — Firoz has not provided a production domain. Canonicals/sitemap stay centralized; replace the one line in `src/data/site.ts` before launch.
- West Virginia remains `needs_verification` (2026 legislation unconfirmed).
- No state withholding figures are configured as verified; the UI says so rather than showing a number.
- No fabricated SEO/Search Console data anywhere.

---

## Deliverables
- Commit: (see final report message)
- Archive: `lottery-calculator-phase3-20260928.zip` → Google Drive folder **Lottery Calculator**
- This report: `docs/PHASE3-REPORT.md`

**STOP — awaiting Firoz's next specification (Powerball, Mega Millions, payout, or odds calculators).**
