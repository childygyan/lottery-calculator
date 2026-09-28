# PHASE 5 REPORT — Payout + Annuity Calculators

Date: 2026-09-28 (IST)
Status: **Complete — hard STOP. Phase 6 starts only on Firoz's go-ahead (spec already received and queued).**

## What was built

Cash-vs-annuity payout comparison on top of the existing architecture — no rebuilds,
no duplicated calculator logic, no invented values.

### Engines (`src/lib/calculator/`)

- **`annuities.ts`** — generic schedule builder + per-payment tax engine:
  - Fixed and growing schedules, annual/monthly frequencies, 600-payment cap,
    final-cent adjustment so payments total exactly.
  - `buildAnnuitySchedule()` returns gross per payment; `calculateAnnuityTaxes()`
    taxes **each payment individually** (federal + state + withholding per payment),
    then aggregates. The cash-option tax path is never applied to an annuity.
  - Cumulative gross/tax/net, averages, effective rates.
- **`payout.ts`** — `validatePayoutForm()` + `calculatePayoutComparison()`:
  - Validates jackpot, required cash value, annuity years, growth %, state, tax year,
    filing status. Cash side delegates to `calculateLotteryWinnings()`;
    annuity side to `buildAnnuitySchedule()` + `calculateAnnuityTaxes()`.
  - `parseShareableAmount()` sanitizes `?amount=` (rejects negatives, garbage, >$10B).
  - Returns assumptions, never a recommendation or ranking.
- Reused `parseAmountField()` — no duplicate parsing logic.

### Data

- `AnnuityConfig` added to `src/data/lotteries/types.ts` with config validation.
- **Powerball**: 30 graduated payments over 29 years; no fixed graduation rate is
  published, so `growthRate: null` — the UI asks the user to enter it (0% = equal payments).
- **Mega Millions**: one immediate payment + 29 annual, each 5% larger (`growthRate: 0.05`),
  locked in the UI as read-only.
- `src/data/jackpots.ts`: 5 amounts ($1M/$10M/$100M/$500M/$1B) each with unique title,
  description, H1, lede, after-tax analysis, cash-vs-annuity discussion, context
  bullets, and FAQs. 9 quick presets ($100K–$1B).

### Components

- `PayoutCalculator.astro` — jackpot + **required** cash value ("Enter the current cash
  value to calculate an estimate."), custom/Powerball/Mega Millions modes, presets,
  tax year/filing status/state, cash-vs-annuity table, per-payment schedule (5 rows +
  expand to all 30), withholding shown separately from final liability, Copy Results,
  print support, `?amount=` prefill.
- `AnnuityScheduler.astro` — generic illustrative scheduler (annual/monthly).
- `AnnuityScheduleTable.astro`, `CashVsAnnuityTable.astro`, `LotteryPayoutPage.astro`
  (amount-page template; every worked number computed at build time with the real engine).
- Print CSS in `src/styles/global.css`.

### Routes (8 new)

- `/lottery-payout-calculator/` · `/lottery-annuity-calculator/` ·
  `/lottery-cash-option-calculator/` (cash-only: no annuity fields/sections at all)
- `/lottery-payout-calculator/1-million/` · `/10-million/` · `/100-million/` ·
  `/500-million/` · `/1-billion/`

## Bugs found and fixed during verification

1. **Unbundled client script** — `define:vars` prevented Astro from bundling `import`
   statements, emitting a classic script with bare `import` (browser SyntaxError).
   Fixed by passing config via `data-*` attributes (lesson recorded in AGENTS.md).
2. **Template used wrong annuity-tax API/fields** — `calculateAnnuityTaxes(schedule, …)`
   instead of `calculateAnnuityTaxes({payments, state, …})`, and `first.gross` /
   `first.effectiveRate` instead of `grossPayment` / `effectiveTaxRate`; the amount
   pages rendered $0/NaN% until fixed. Also fixed `afterTax→afterTaxBody`,
   `cashVsAnnuity→cashAnnuityBody`, `f.q/f.a→question/answer`.
3. **Vite chunk-splitting broke the DOM test harness** — new shared chunks made
   `vm.runInContext` fail ("Cannot use import statement outside a module").
   Rewrote the harness (`tests/dom-utils.ts`) to dynamic-import built modules with
   JSDOM globals; this also repaired the 8 pre-existing calculator DOM tests.
4. **Cash-only page leaked annuity UI** — hidden annuity sections/assumptions
   removed server-side in cash mode.

## Verification (all real, 2026-09-28)

- `npx tsc --noEmit`: **0 errors**
- `npm test`: **171/171 pass** (123 Phases 1–4 + 33 new annuity/payout unit +
  14 new payout built-DOM + 1 bundle-size), 0 fail, 0 cancelled
- `npm run build`: **72 pages**, clean
- Lottery audit: **4/4 green** · State audit: **52/52 green** (51 distinct signatures)
- Internal links: **71 unique, 0 broken** (71 pages scanned)
- SEO: unique titles/descriptions/canonicals/H1 per route; BreadcrumbList on all 8,
  FAQPage on amount pages; sitemap has all 8; robots clean
- A11y spot check (4 new routes): all inputs labeled, 0 empty buttons, 0 images
  without alt; schedule tables use `<th scope="row">`; results are `aria-live`
- Client JS: **38,583 bytes raw / 14,471 gzip total**; payout page loads ~32KB raw
  (~12KB gzip) — entry + shared chunks only
- Content audit: "roughly half" cash-option phrasing is always qualified
  ("ratio is never fixed… enter the official value"); no guaranteed-win claims;
  no "cash is better"/"annuity is better" language; no fake ratings/schema

## Delivery

- GitHub `childygyan/lottery-calculator`, branch `main`: commit `2bef18f740651d42b1a93eab7783f288994be5d0`
- Archive `lottery-calculator-phase5-20260928.zip` (250,378 bytes, 138 files, no
  node_modules/dist) → Google Drive folder `Lottery Calculator` (file id
  `1q-GjbdJF-LOnNigxaudXdlnEp5ZbrSoE`)

## Standing notes for future phases

- Astro lesson: never combine `define:vars` with `import` in a client script —
  pass config via `data-*` attributes so Vite bundles the script.
- `npx tsc --noEmit` does **not** reliably type-check `.astro` frontmatter/templates;
  the production build plus built-DOM tests are the real gate.
- DOM tests now execute the real chunked bundles via dynamic import
  (`tests/dom-utils.ts`); keep that pattern when adding client scripts.
