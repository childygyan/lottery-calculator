# Phase 7 Report — Lottery Number Generator + Combination Tools

**Date:** 2026-09-28 (IST)
**Status:** Complete
**Scope:** 4 new routes, 1 generator engine, 2 components, full verification, archive, GitHub push, Drive upload.

## What was built

### Generator engine — `src/lib/generator/` (new)

- `random.ts` — `cryptoRandomSource()` using `crypto.getRandomValues()` with rejection
  sampling (no modulo bias), plus a documented `Math.random()` fallback only when
  WebCrypto is unavailable; `sequenceRandomSource()` for deterministic tests.
- `generator.ts` — `generateTicket()` / `generateTickets()` on a generic model
  (`mainNumbers`, `bonusNumber` / `bonusNumbers`), partial Fisher–Yates draws,
  sorted ascending main numbers, bonus balls kept separate, no intra-ticket duplicates,
  duplicate combinations avoided across tickets by default, bounded attempt cap
  (no infinite loops), upfront rejection when the request exceeds the mathematically
  possible combinations.
- `types.ts` — `GeneratorGameConfig`, `GeneratedTicket`, `RandomSource` DI interface,
  `MAX_SETS_PER_REQUEST = 100`, and the exact error constant:
  `"Please choose a smaller number of combinations."`
- Reuses Phase 6's `calculateCombinations()` for totals — no duplicated combination math.
- Configs derive from the centralized Powerball / Mega Millions configs via
  `generatorConfigFromLotteryConfig()` — no hard-coded rules in UI or engine.
- Verified totals: Powerball 292,201,338; Mega Millions 290,472,336 (parity with Phase 6).

### Routes (4)

| Route | Mode |
|---|---|
| `/lottery-number-generator/` | Generic: custom main/bonus pools + PB/MM presets |
| `/powerball-number-generator/` | Locked to verified 5/69 + 1/26, $2/play |
| `/mega-millions-number-generator/` | Locked to verified 5/70 + 1/24, $5/play |
| `/lottery-combination-generator/` | Counts distinct combinations via the shared odds engine |

### Components (2)

- `NumberGenerator.astro` — generic + locked modes (config via `data-*` attrs, no
  `define:vars`), 1/5/10/custom quantity (1–100), dedup checkbox on by default,
  sorted balls with per-ticket accessible labels, aria-live announcement
  ("N new lottery number sets generated."), copy-all, print, session-only in-memory
  history capped at 20 sets with clear, required disclaimer verbatim. No storage,
  no network, no personal data.
- `CombinationCalculator.astro` — main/bonus pools + optional ticket price; reuses
  `calculateJackpotCombinations()` and the existing formatters; shows total
  combinations, one-ticket jackpot odds, main/bonus breakdown, and an illustrative
  full-coverage cost explicitly labeled as arithmetic, not purchasing advice.

### Constraints honored

- The generator is presented strictly as a random-number utility. No claims that
  generated numbers increase chances, are lucky, are statistically better, are more
  likely to win, or predict future drawings. No AI prediction, no hot/cold/due
  numbers, no historical-frequency analysis.
- Required disclaimer present verbatim on all three number-generator pages.
- No Review/Rating schema; only BreadcrumbList + FAQPage JSON-LD.
- Homepage calculator cards + footer navigation updated; no links to unbuilt routes.

## Verification (real numbers)

- `npm test`: **273/273 pass** (234 Phase 1–6 regression + 24 new generator unit +
  15 new built-DOM). Generator unit tests use deterministic dependency injection;
  randomness is never tested statistically.
- `npx tsc --noEmit`: 0 errors.
- `astro build`: clean, **80 pages** (79 index + 404).
- `scripts/audit-generator-pages.mjs` (new): **4/4 routes, 0 failures, 0 warnings**
  (SEO/schema/sitemap/canonicals, exact disclaimer, forbidden-claim scan, labels,
  aria-live, unique non-thin content).
- Phase 6 odds audit regression: 4/4, 0 failures, 0 warnings.
- Lottery audit regression: 0 failures, 0 warnings.
- State audit regression: 0 failures, 0 warnings.
- Site-wide internal-link scan: 79 pages, **2,922 links checked, 0 broken**.
- Client JS total: **58,593 bytes** (budget 120KB).

## Bugs found and fixed

1. `CombinationCalculator.astro` passed the `{valid, error}` object from
   `validateLotteryOddsConfig()` straight into the error element ("[object Object]").
   Fixed by switching the whole calculation to `calculateJackpotCombinations()`,
   which also removed the duplicated bonus-multiplication logic.
2. DOM tests: label-digit parsing for "Main numbers …, Powerball N", the
   bonus-pick=0/bonus-pool=0 validation pair, and claim-scan regexes matching
   denial sentences ("cannot predict…", "no hot or cold numbers"). All test-side.

## Deliverables

- Local commit: `2d1a56c` (lottery-calculator, branch `master`)
- GitHub: `childygyan/lottery-calculator`, remote `main` → `<commit>`
- Archive: `lottery-calculator-phase7-20260928.zip` → Drive folder "Lottery Calculator"
- This report: `docs/PHASE7-REPORT.md`
