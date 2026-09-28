# Lottery Calculator — Phase 4 Report

**Date:** 2026-09-28
**Scope:** Powerball + Mega Millions calculators (§1–§32 of the Phase 4 spec)
**Status:** Complete. Hard STOP — Phase 5 starts only on Firoz's next spec.

**GitHub:** https://github.com/childygyan/lottery-calculator (`main` → `90256aa7`)
**Archive:** https://drive.google.com/file/d/1DbAgasvpD2-DBL-4xV9_7nOPKRGtSmEt/view?usp=drivesdk
(`lottery-calculator-phase4-20260928.zip`, 191,383 bytes, 118 files, in the
"Lottery Calculator" Drive folder; no node_modules/dist)

## What was built

**4 new routes** (all static, all working calculators — no mockups):

- `/powerball-calculator/` — Powerball Calculator (game rules, prize tiers, odds, calculator, FAQs)
- `/mega-millions-calculator/` — Mega Millions Calculator (same structure, independently written)
- `/powerball-tax-calculator/` — Powerball Tax Calculator (federal/state/cash/withholding/take-home explainers)
- `/mega-millions-tax-calculator/` — Mega Millions Tax Calculator (same structure, independently written)

**Data model** (`src/data/lotteries/`): generic `LotteryConfig` with rule versioning
(`version`, `effectiveDate`, `expirationDate`, `lastVerified`), number pools, ticket
price, jackpot odds, prize tiers, multiplier rules, annuity description, and source
references. `validateLotteryConfig()` refuses invalid configs. No game rules are
hard-coded in UI components.

**Engine** (`src/lib/calculator/lottery-games.ts`): `calculateLotteryGame({ lottery, ... })`
validates the game config, then delegates to the shared `calculateLotteryWinnings()`
engine. There is no `calculatePowerballTax()` / `calculateMegaMillionsTax()` — both
games return the identical normalized `LotteryCalculationResult`. State tax uses the
existing 2026 state engine (CA = $0, no-income-tax states = $0, WV still flagged).

**Components:** `LotteryGameHeader`, `LotteryPrizeTable` (real `<table>` on desktop,
stacked cards on mobile — no horizontal scroll), `LotteryOddsCard`,
`LotteryTaxSummary`, `LotteryGameSwitcher` ("Other Lottery Calculators").
Reused: `LotteryCalculator` (one new optional `cashHint` prop), `Methodology`,
`FAQ`, `SourceList`, `RelatedLinks`, `Disclaimer`, `Breadcrumbs`.

**Rule verification (2026-09-28, before writing any values):**

- Powerball — verified against the official rules page (powerball.com/games/home):
  $2/play, 5 white balls 1–69 + red Powerball 1–26, drawings Mon/Wed/Sat 10:59 p.m. ET,
  30 graduated payments over 29 years or lump sum, Power Play +$1 (2X–10X, 10X only at
  jackpots ≤ $150M, Match 5 + Power Play always $2M), Double Play +$1.
- Powerball prize tiers — 9 tiers corroborated across multiple current sources
  (lotteryusa.com, powerball.net, Sept 2026 drawing coverage): jackpot 1 in 292,201,338
  down to Powerball-only $4 at 1 in 38.32; overall 1 in 24.87.
- Mega Millions — verified against the official how-to-play page
  (megamillions.com/how-to-play): $5.00/play with multiplier included, 5 white balls
  1–70 + gold Mega Ball 1–24, drawings Tue/Fri 11:00 p.m. ET, 9 tiers with 2X–10X
  multiplier randomly assigned at purchase, jackpot 1 in 290,472,336, annuity of one
  immediate payment + 29 annual payments each 5% larger.
- Starting jackpots ($20M Powerball / $50M Mega Millions) are the advertised figures
  reported by current lottery coverage, recorded as such in the source registry.

**Honesty:** cash value is never invented — every lottery calculator shows
"Enter the current cash value to calculate an estimate." No live jackpot scraping
(architecture is ready for a future phase). No fake ratings/reviews/structured data.

**Internal linking:** game switcher on all 4 pages, related-links blocks, footer links
for all 4 pages, homepage "Popular Lottery Calculators" now shows Powerball / Mega
Millions / Lottery Tax Calculator as live cards (Payout, Annuity, Odds remain
"Coming soon"). No links to routes that don't exist.

## Verification

- `tsc --noEmit`: 0 errors.
- **123/123 tests pass** (90 Phase 1–3 + 26 new lottery-games unit + 7 new built-DOM).
  Includes: config validation (both games + 7 invalid-config rejections), engine
  equivalence (both games == shared engine output), CA $0 / NY positive state-tax
  integration, withholding-vs-liability separation, unknown-lottery and invalid-config
  throws, annuity behavior.
- `astro build`: clean, **64 pages** (60 before + 4 new).
- `scripts/audit-lottery-pages.mjs`: 4/4 pages green — titles, canonicals, meta
  descriptions, H1, BreadcrumbList + FAQPage JSON-LD, calculator wiring, cash hint,
  no fake schema, no placeholder leaks, 0 broken internal links, sitemap coverage
  (each URL exactly once), unique titles/descriptions, required sibling cross-links.
- `scripts/audit-state-pages.mjs` (regression): 52/52 green, 0 failures, 0 warnings.
- Internal links: 65 unique (was 61), 0 broken. Sitemap: 63 URLs (was 59).
- Accessibility spot check on all 4 pages: lang, title, single H1, labeled inputs,
  no images without alt — 0 issues.
- Client bundle unchanged: **13,932 bytes raw / 5,235 bytes gzip** per page (lottery
  configs stay server-side; no config data shipped to the browser).
- Prize tables render as cards below the `md` breakpoint (verified in built HTML).

## Constraints carried forward

- Site URL still the unverified placeholder `https://lotterycalculator.example.com`.
- West Virginia still `needs_verification`; lottery pages inherit the same treatment.
- Phase 2's Tax Foundation source limitation still applies (general 2026 rates;
  lottery-specific treatment beyond the general rate is not asserted).

## STOP

Phase 4 is complete. Nothing about Phase 5 (odds/payout calculators or live jackpot
data) has been started.
