# Final Calculation Audit — Lottery Calculator (Phase 10)

**Date:** 2026-10-12
**Scope:** every engine that produces a user-facing number — tax, payout, annuity, odds, combinations, generator, withholding — plus the game/tax data it runs on.
**Method:** ran the real exported functions (`node scripts/gen-final-vectors.ts`), pasted actual outputs into `tests/fixtures/final-calculation-vectors.json` (11 vectors), and locked them with `tests/final-vectors.test.ts` (12/12 pass). Nothing below is hand-computed.

> Note on paths: the tax data lives at `src/data/taxes/` (plural), not `src/data/tax/`. All citations below use the real path.

## 1. Federal tax engine (`src/lib/calculator/federal-tax.ts`)

- Data: `src/data/taxes/federal/2026.ts`, registered in `src/data/taxes/federal/index.ts`. **Tax year 2025 (or any other year) has no data — only 2026 ships.**
- Brackets per IRS Revenue Procedure 2025-32 (source ID `irs-rev-proc-2025-32`, rule `lastVerified: "2026-09-28"`, `status: "verified"`).
- All 4 filing statuses present with brackets + standard deduction:
  - single: $16,100 · married_jointly: $32,200 · married_separately: $16,100 · head_of_household: $24,150.
- Liability = progressive brackets on (winnings − standard deduction); ignores other income, itemized deductions, credits, AMT, NIIT — stated in the rule notes and in the result's `methodology` string.
- Vectors: $100M single CA → federal $36,950,000.25; $10M married-jointly TX → $3,610,250.50; $1M annuity payment head-of-household NY → $315,213.50.

**Verdict: no finding on the math or data.** One behavioral finding below (P2).

## 2. State tax engine (`src/lib/calculator/state-tax.ts`)

- Data: `src/data/taxes/states/2026.ts` (Tax Foundation "State Individual Income Tax Rates and Brackets, 2026", `lastVerified: "2026-09-28"`). Again, **2026 only**.
- Modeling is honest about its limits: graduated states use `taxCalculationType: "top_marginal_estimate"` — the top marginal rate applied flat as a planning estimate. Verified against vectors: NY 10.9% × $1M = $109,000.00 exactly.
- CA: `taxTreatment: "special_exemption"` → $0 state tax ("California exempts California Lottery winnings"). TX: `no_state_individual_income_tax` → $0. Both represented semantically, not as rate = 0.
- States without a verified rule are marked `needs_verification` and never filled with a guess (honesty rule in the data file, enforced by existing tests).

**Verdict: no finding.** The top-marginal-flat approximation is disclosed in-code, in the data notes, and in result methodology — transparency is adequate (recorded as a P3 note only).

## 3. Lottery rules (`src/data/lotteries/powerball.ts`, `mega-millions.ts`)

Quoted verbatim from the configs — nothing invented:

| Game | `version` | `lastVerified` | `jackpotOdds` |
|---|---|---|---|
| Powerball | `"2026"` | `"2026-09-28"` | `292_201_338` |
| Mega Millions | `"2026"` | `"2026-09-28"` | `290_472_336` |

(There is no `ruleVersion` field; versioning is via `version` + `effectiveDate` + `lastVerified`.)
- Powerball: 5 of 69 + Powerball 1–26; ticket $2; draws Mon/Wed/Sat. Mega Millions: 5 of 70 + Mega Ball 1–24; ticket $5; draws Tue/Fri.
- Engine check: `calculateJackpotCombinations(lotteryOddsConfigFromGame(...))` reproduces the config's `jackpotOdds` exactly for both games (292,201,338 = 11,238,513 × 26; 290,472,336 = 12,103,014 × 24) — locked in the odds vectors.
- Multi-ticket: 10 Powerball tickets → P ≥ 1 win = 3.422297722988077e-8 via `calculateAtLeastOneWin` (1 − (1 − p)^10, distinct-ticket assumption stated in code).

**Verdict: no finding.** Rules data is versioned, dated, and the odds engine reproduces it.

## 4. Payout / annuity engines (`src/lib/calculator/payout.ts`, `annuities.ts`, `annuity.ts`)

- **Cash values are user-entered, never invented:** `validatePayoutForm` requires the cash option (`parseAmountField` → `"Cash option is required."`), rejects cash > jackpot, and the code comment states explicitly: *"The cash option is required and must not exceed the advertised jackpot — it is never invented or defaulted from the jackpot."*
- Vectors: Powerball $500M / $250M cash, CA, single, 2026 → cash side gross $250,000,000, federal tax $92,450,000.25, state $0, net $157,549,999.75, federal withholding $60,000,000.
- **Annuity growth is a user assumption.** `validatePayoutForm` defaults `annualIncrease` to 0 and parses it from user input (0–100%). `buildAnnuitySchedule`: growth = 0 → equal payments; growth > 0 → geometric series whose nominal total equals the advertised jackpot (final payment adjusted so the total matches exactly). Powerball publishes no fixed graduation rate — the 5% in the vector is a labeled user assumption (first payment $7,525,717.54 → last $30,976,873.83, total $500,000,000.00). (Mega Millions' config separately records its own 5% graduated structure as a game fact; the payout UI still treats growth as user-entered for both.)
- Each annuity payment is taxed in its own year via the same tax engine — the cash-option tax is never applied to the annuity total. The 0%-growth vector: annuity gross $500M, total tax $183,500,007.56, net $316,499,992.44.
- `assumptions[]` is emitted with every comparison; the engine deliberately contains no recommendation field.

**Verdict: no finding.**

## 5. Withholding vs liability (`src/lib/calculator/withholding.ts`)

- Separate engine, separate function, separate result fields. Federal: 24% on payouts over $5,000 (`withholdingRate: 0.24`, `withholdingThreshold: 5000` from the federal rule META). State: `withholdingRate` is null for every state in the 2026 data (helpers never set it) → engine returns `null`, reported as "varies / not available", never silently 0%.
- Vector: $1M → federal withholding $240,000.00 = exactly 24% × $1,000,000; the same $1M's federal *liability* is $320,000.25 — a different number, reported in different fields, and the result methodology states: *"Withholding (24% federal on payouts over $5,000) is credited against the final liability, not added to it."*
- The test asserts `withholding ≠ liability` explicitly.

**Verdict: no finding.** Separation is structural, not cosmetic.

## 6. Combinations / odds math (`src/lib/calculator/odds.ts`)

- `calculateCombinations(69, 5) = 11,238,513` via the multiplicative formula (exact while within MAX_SAFE_INTEGER). Vector + test lock it.
- Guard rails verified by reading the code: non-integer/negative/`r > n` inputs rejected with errors; overflow returns a controlled error, never a rounded guess.

**Verdict: no finding.**

## 7. Generator (`src/lib/generator/`)

- Pure functions; randomness injected via `RandomSource`. `sequenceRandomSource` (deterministic) used for the vector/test; production uses `cryptoRandomSource()` (rejection-sampled `crypto.getRandomValues`, Math.random fallback documented as degraded).
- 100 Powerball sets generated with a fixed seed (mulberry32(12345), recorded in the fixture): every set — 5 mains, all in 1–69, strictly ascending, no intra-ticket duplicates; bonus in 1–26. All properties true; first ticket `[1, 6, 37, 38, 54] + PB 2` locked in the fixture.
- Honesty copy in the engine header: *"Generated numbers do not improve the mathematical odds of winning and cannot predict future winning numbers."*
- `generateTickets` caps at `MAX_SETS_PER_REQUEST` (100), dedups by default, and refuses requests exceeding the mathematically possible unique combinations.

**Verdict: no finding.**

## Findings (P-classified)

| ID | Severity | Finding | Location |
|---|---|---|---|
| F-1 | **P2** | **Silent tax-year fallback.** `calculateLotteryWinnings` (lottery.ts) and `calculateAnnuityTaxes` (annuities.ts) substitute `DEFAULT_TAX_YEAR` (2026) when given an unsupported year, with no error or warning. `calculateWithholding` degrades worse for an unsupported year: federal rule lookup returns `undefined` → federal withholding **0** (not an error), state → null. The shipped UI only offers supported years (`validatePayoutForm` errors on others; dropdowns built from `getStateOptions(taxYear)`), so this is a latent programmatic-caller hazard, not a live user-facing bug. While auditing, my first draft of this fixture labeled a vector "2025" while the engine actually computed 2026 rules — proof of how quietly this can mislead. Locked by a dedicated `tax-fallback` vector + regression test so the behavior can't change silently. | `src/lib/calculator/lottery.ts`, `src/lib/calculator/annuities.ts`, `src/lib/calculator/withholding.ts` |
| — | P3 note | State tax uses top marginal rate as a flat planning estimate for graduated states (e.g. NY 10.9% flat on $1M). This overstates state tax vs real graduated brackets. It is disclosed in the data-file honesty rules, per-state notes, and result methodology, so no action — recorded for the record. | `src/data/taxes/states/2026.ts` |
| — | none | No P0/P1 findings. No invented values found anywhere in the audited paths: cash values user-entered, growth user-entered, withholding rates null-not-zero, unverified states marked `needs_verification`, generator randomness honest. | — |

## Summary

- **Per-engine verdicts:** tax ✓ · state tax ✓ · lottery rules ✓ · payout/annuity ✓ · withholding ✓ · odds/combinations ✓ · generator ✓ — no P0, no P1.
- **One P2:** silent tax-year fallback (unsupported years → 2026, no error; withholding degrades to 0). Behavior is now a locked regression vector (`tax-fallback`); consider having the engines throw/return an error for unsupported years in a future phase.
- **One P3 note:** top-marginal-flat state estimate, already disclosed.
- **Deliverables:** `tests/fixtures/final-calculation-vectors.json` (11 vectors, `generatedAt: "2026-10-12"`), `tests/final-vectors.test.ts` (12 tests, all pass), `scripts/gen-final-vectors.ts` (regenerates the fixture from the real engines).
