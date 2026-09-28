# Lottery Calculator — Phase 2 Report

**Date:** 2026-09-28
**Scope:** Calculation architecture, tax-rule architecture, tax-year support, state configuration, accuracy, testability, maintainability (§1–§26 of the Phase 2 spec)
**Constraint honored:** No rebuild. All work extends the Phase 1 Astro 5 + strict TypeScript + Tailwind v3 codebase.

---

## What was built

### 1. Central types (`src/lib/calculator/types.ts`)
- `FilingStatus`: `single | married_jointly | married_separately | head_of_household` (+ labels, validation)
- `TaxYear`, `PayoutChoice` (`lump_sum | annuity`), `TaxBracket`
- Rule statuses: `verified | needs_verification | not_applicable | not_supported`
- Semantic state treatments: `ordinary_income | lottery_specific_tax | no_state_individual_income_tax | withholding_only | special_exemption | unknown`
- `FederalTaxRule`, `StateTaxRule` (code, slug, name, taxTreatment, incomeTaxApplicable, lotteryTaxApplicable, withholdingApplicable, taxRate, withholdingRate, effectiveDate, lastVerified, source, sourceName, notes, status), `WithholdingResult`, serializable `LotteryCalculationResult`
- `friendlyRuleStatus()` converts statuses to user-facing notices

### 2. Source registry (`src/data/sources.ts`)
Registered source IDs for IRS Rev. Proc. 2025-32, IRS gambling-withholding guidance, Tax Foundation 2026 state table, California Lottery exemption, WA/NH no-income-tax treatment, WV SB 392. URLs left `null` where the authoritative address was not verified — never guessed.

### 3. Federal 2026 data (`src/data/taxes/federal/2026.ts` + `index.ts`)
All four filing statuses with standard deductions and 7 progressive brackets. Withholding modeled separately (24% over $5,000) from final liability.

| Status | Std deduction | 10% | 12% | 22% | 24% | 32% | 35% | 37% over |
|---|---|---|---|---|---|---|---|---|
| Single | $16,100 | $12,400 | $50,400 | $105,700 | $201,775 | $256,225 | $640,600 | — |
| Married jointly | $32,200 | $24,800 | $100,800 | $211,400 | $403,550 | $512,450 | $768,700 | — |
| Married separately | $16,100 | $12,400 | $50,400 | $105,700 | $201,775 | $256,225 | $384,350 | — |
| Head of household | $24,150 | $17,700 | $67,450 | $105,700 | $201,750 | $256,200 | $640,600 | — |

Cross-checked 2026-09-28 against Tax Foundation, ThinkAdvisor, H&R Block, NerdWallet, VisaVerge, Newsweek, and the hindustanmetro worked example ($100k single → $16,712, reproduced exactly). HoH 32% boundary recorded as $201,750 (not the single-filer $201,775).

### 4. State 2026 data (`src/data/taxes/states/2026.ts` + `index.ts`)
51 jurisdiction records from the Tax Foundation "State Individual Income Tax Rates and Brackets, 2026" table (page dated 2026-02-11, checked 2026-09-28). Key modeling decisions:
- No-income-tax states use semantic `no_state_individual_income_tax`, never a bare `rate = 0`
- California uses `special_exemption` (lottery winnings exempt from CA income tax)
- **West Virginia is `needs_verification`** — possible 2026 SB 392 changes not confirmed against an authoritative source
- Most taxed states carry `verified` for their general top-marginal planning rate; lottery-specific treatment beyond the general rate is not asserted
- `getStatePageContexts()` prepares `{code, name, slug}` for future state pages — **no state routes generated in Phase 2** per spec

### 5. Calculation engines (all pure, unit-tested)
- `federal-tax.ts` — progressive tax, standard-deduction taxable income, filing-status liability
- `state-tax.ts` — liability from semantic treatment + configured rate
- `withholding.ts` — federal/state withholding **separate from final liability**; state withholding `null` when no single verified figure exists (never a silent 0)
- `annuity.ts` — 30-year equal-payment model + schedule
- `lottery.ts` — orchestration returning one normalized `LotteryCalculationResult`; expanded validation (empty/zero/negative/NaN/Infinity/unknown year-status-state/cash>jackpot/>$10B cap)
- `formatting.ts` — centralized `roundToCents()` (§13); strict comma-grouping in `parseCurrencyInput` ("1,2,3" rejected)

Phase 1 files `src/data/taxes/federal.ts`, `src/data/taxes/states.ts`, `src/lib/calculator/tax.ts` removed; nothing imports them.

### 6. UI
- `LotteryCalculator.astro` — payout toggle (lump sum/annuity), Tax Year + Filing Status selects, state select (51 options), cash field hides in annuity mode
- `ResultCard.astro` — split into **Estimated Results** and **Tax Details**; withholding shown as credited advance payment, not added tax; state verification notice via `friendlyRuleStatus`
- `Methodology.astro` — reusable "How We Calculate" (§17)
- `Disclaimer.astro` — Firoz's exact requested text (§25)
- `/lottery-calculator/` page — new content covering jackpot vs cash value, federal tax, state tax, withholding vs liability, why actual winnings vary, why results are estimates (§24); Methodology component wired in

### 7. Tests (76 total, all passing)
- `tests/fixtures/federal-2026.ts` — hand-computed bracket expectations (boundary, middle, high income)
- `tests/fixtures/states-2026.ts` — verified-rate table, no-tax/exempt sets, all 51 jurisdictions
- `federal-tax.test.ts` — progressive tax (10 cases incl. exact boundaries), filing statuses, standard deductions, end-to-end liability
- `state-tax.test.ts` — 51-rule coverage, verified rates, semantic treatments, WV `needs_verification`
- `lottery.test.ts` — $1M/$10M/$100M/$1B end-to-end, annuity mode, withholding-vs-liability separation, MFJ < single check
- `formatting.test.ts` — $1/$1K/$1M/$1B, cents, percent, strict parsing
- `validation.test.ts` — all rejection paths
- `tests/dom.test.ts` — 9 tests running the **real bundled script against real built HTML** (valid submit fills both sections, WV notice, annuity toggle, error/focus behavior, aria-live, mobile menu, no localhost leaks)

---

## Verification results (2026-09-28)

| Check | Result |
|---|---|
| `tsc --noEmit` (strict) | 0 errors |
| `npm run build` | clean, 8 pages |
| Unit tests (`npm test`) | 67/67 pass |
| DOM tests (`npm run test:dom`, needs build) | 9/9 pass |
| Internal links (all 8 pages) | 0 broken |
| SEO basics (title/desc/canonical/exactly-1-h1/no "undefined") | all pages pass |
| Preview server (all routes incl. 404) | HTTP 200 |
| Client bundle | 13.5 kB raw / 5.2 kB gzip (only 2026 tax data shipped; no historical bloat) |
| TODO/FIXME in production code | none |
| localhost/127.0.0.1 leaks in built HTML | none |

### Hand-verified calculation spot checks
- $100M jackpot / $48M cash, NY, single, 2026 → federal $17,710,000.25, state $5,232,000, total $22,942,000.25, take-home $25,057,999.75 (unit + DOM tests assert these)
- $100k taxable single → $16,712 federal (matches published worked example)
- MFJ standard deduction $32,200 and halved MFS brackets verified structurally

---

## Honest limitations
- Only tax year **2026** is supported; the year-registry architecture is ready for more.
- West Virginia state tax is `needs_verification`; the UI shows an explicit notice, never a fabricated rate.
- State estimates use top-marginal planning rates and exclude local/city taxes; every figure is labeled "Estimated".
- Site URL is still the `https://lotterycalculator.example.com` placeholder — one-line change in `src/data/site.ts` before launch.
- No state SEO pages yet — architecture prepared (`getStatePageContexts`), generation deferred to Phase 3.

---

## Deliverables
- Source: `~/workspace/lottery-calculator/` (pushed to GitHub `childygyan/lottery-calculator`)
- Archive: `lottery-calculator-phase2-20260928.zip` → Google Drive folder "Lottery Calculator"
