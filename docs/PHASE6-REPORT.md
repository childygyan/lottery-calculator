# PHASE 6 REPORT — Lottery Odds + Probability Calculators

Date: 2026-09-28 (IST)
Status: **Complete — Phase 7 starts automatically next (spec already received and queued).**

## What was built

A reusable, mathematically correct Lottery Odds + Probability platform on top of the
existing architecture — no rebuilds, no duplicated calculator logic, no invented values.

### Engine (`src/lib/calculator/odds.ts`)

- **All 8 required functions**: `calculateCombinations()`, `calculateProbability()`,
  `calculateOdds()`, `calculateAtLeastOneWin()`, `calculateExpectedTickets()`,
  `calculateTicketCost()`, `calculateCustomLotteryOdds()`, `calculateExpectedCost()`.
- Plus `lotteryOddsConfigFromGame()` / `validateLotteryOddsConfig()` (jackpot
  combinations derive from the centralized verified game configs, never from
  hard-coded totals) and formatting helpers `formatOneInX()`, `formatTinyPercent()`,
  `formatWholeNumber()`.
- Stable multiplicative `C(n,r)` — no factorial recursion; controlled error when the
  exact result would exceed `Number.MAX_SAFE_INTEGER`.
- Validates negative, zero, non-integer, `r > n`, huge, and overflow-prone inputs.
- Multiple-ticket probability uses `1 − (1 − p)^n` (distinct/independent tickets,
  documented on-page); dust clamped to `[0, 1]`.
- Expected tickets/cost are documented as mathematical expectations, not guarantees.
- Limits: `MAX_NUMBER_POOL = 10,000`, `MAX_TICKET_COUNT = 1,000,000,000`.
- Exported from `src/lib/calculator/index.ts` barrel.

### Routes (4, all working calculators — no mockups)

- `/lottery-odds-calculator/` — generic: main picks/pool, optional bonus picks/pool,
  ticket price, ticket count, Powerball/Mega Millions presets; jackpot odds, single +
  multi-ticket probability, combinations, ticket cost, expected tickets/cost, copy.
- `/lottery-probability-calculator/` — probability explorer: Powerball / Mega Millions /
  custom `1 in X`; preset rows 1/10/100/1,000/10,000 + custom ticket count; accessible
  results table; optional/default verified ticket price.
- `/powerball-odds-calculator/` — locked to verified config (5/69 + 1/26, $2),
  computed at build time: **1 in 292,201,338**; prize-tier table from config.
- `/mega-millions-odds-calculator/` — locked to verified config (5/70 + 1/24, $5),
  computed at build time: **1 in 290,472,336**; prize-tier table from config.
- All pages: unique titles/descriptions/H1s/canonicals, breadcrumbs + BreadcrumbList
  JSON-LD, FAQ sections + FAQPage JSON-LD, formula explanations, sources,
  methodology, disclaimers, related links to existing routes only.
- Required factual concept present on every page: *"Buying additional tickets
  increases the number of combinations covered, but the jackpot probability may
  remain extremely small."*
- No ranking (best/worst/easiest/hardest), no misleading probability bars,
  no fake schema, no "lucky"/"guarantee" language.

### Components

- `OddsCalculator.astro` — generic + locked modes; config via `data-*` attributes
  (ordinary bundled Astro client script, no `define:vars`); accessible status,
  Copy Results.
- `ProbabilityExplorer.astro` — preset ticket-count table, custom odds input,
  accessible announcements.
- Homepage: Odds + Probability moved from Coming Soon to live calculator cards;
  nav footer lists the new pages; Powerball/Mega Millions calculator pages link
  to their odds pages.

## Verification (real numbers)

- **234/234 tests pass** (`npm test`): 171 Phase 1–5 regression + 63 new
  (47 unit in `tests/odds.test.ts`, 16 built-DOM in `tests/odds-dom.test.ts`).
  Unit tests cover known combinations (C(5,2)=10, C(10,5)=252, C(69,5)=11,238,513,
  C(70,5)=12,103,014, C(6,49)=13,983,816), both jackpot totals derived from config,
  1/10/100/1,000/1,000,000-ticket probabilities, monotonicity, one-ticket ≈ p,
  probability ≤ 100%, input failures, bounds, formatting.
- **DOM tests use the real bundled scripts** against the real built HTML:
  6/49 → "1 in 13,983,816"; invalid picks → friendly error; Powerball locked
  (10 tickets → "1 in 292,201,338", "$20"); Mega Millions locked → "1 in 290,472,336";
  probability table rows + custom count; copy-button enable/status.
- `npx tsc --noEmit`: 0 errors. `npm run build`: clean, **76 pages** (75 + 404).
- `scripts/audit-odds-pages.mjs`: **4/4 routes, 0 failures, 0 warnings** (SEO,
  canonicals, JSON-LD, sitemap, broken links, duplicate content, forbidden
  language, a11y label checks).
- `scripts/audit-lottery-pages.mjs`: 4/4 green. `scripts/audit-state-pages.mjs`:
  52/52 green. 0 broken internal links site-wide.
- Client JS total: **49,364 bytes raw / 18,655 gzip** (was 38,583 / 14,471).
- Fixed along the way: 3 over-tight test tolerances that exceeded double precision
  (floating-point subtraction near 1 limits absolute precision to ~1e-16);
  one stale Phase 4 assertion ("no link to unbuilt odds calculator" — now built).

## Handoff

- GitHub: `childygyan/lottery-calculator`, remote branch `main` → commit `<TBD>`
- Archive: `lottery-calculator-phase6-20260928.zip` → Google Drive folder
  "Lottery Calculator" (file id `<TBD>`)
