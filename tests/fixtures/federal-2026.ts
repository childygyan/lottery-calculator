/**
 * Test fixtures for tax year 2026 federal rules.
 * Expected values are hand-computed from IRS Rev. Proc. 2025-32 brackets.
 * See docs/PHASE2-REPORT.md for the arithmetic.
 */
import type { FilingStatus, TaxBracket } from "../../src/lib/calculator/types.ts";

/** Single-filer 2026 brackets, duplicated here so tests don't just re-read the data file. */
export const SINGLE_2026_BRACKETS: TaxBracket[] = [
  { upTo: 12400, rate: 0.1 },
  { upTo: 50400, rate: 0.12 },
  { upTo: 105700, rate: 0.22 },
  { upTo: 201775, rate: 0.24 },
  { upTo: 256225, rate: 0.32 },
  { upTo: 640600, rate: 0.35 },
  { upTo: null, rate: 0.37 },
];

export const STD_DEDUCTION_2026: Record<FilingStatus, number> = {
  single: 16100,
  married_jointly: 32200,
  married_separately: 16100,
  head_of_household: 24150,
};

export interface ProgressiveCase {
  name: string;
  income: number;
  expected: number;
}

/** Hand-computed progressive-tax expectations (single 2026 brackets). */
export const PROGRESSIVE_CASES: ProgressiveCase[] = [
  { name: "zero income", income: 0, expected: 0 },
  { name: "negative income", income: -5000, expected: 0 },
  { name: "small income below first cap", income: 5000, expected: 500 },
  {
    name: "exactly at first bracket boundary",
    income: 12400,
    expected: 1240,
  },
  {
    name: "one dollar into second bracket",
    income: 12401,
    expected: 1240.12,
  },
  {
    name: "exactly at second bracket boundary",
    income: 50400,
    expected: 1240 + 38000 * 0.12, // 5800
  },
  {
    name: "middle bracket ($100k taxable)",
    income: 100000,
    expected: 16712,
  },
  {
    name: "exactly at top bracket boundary",
    income: 640600,
    expected: 192979.25,
  },
  {
    name: "high income ($1M taxable)",
    income: 1000000,
    expected: 325957.25,
  },
  {
    name: "extremely high income ($1B taxable)",
    income: 1000000000,
    expected: 192979.25 + (1000000000 - 640600) * 0.37,
  },
];

/** End-to-end federal liability expectations (winnings -> taxable -> tax). */
export interface LiabilityCase {
  name: string;
  winnings: number;
  filingStatus: FilingStatus;
  expectedTaxable: number;
  expectedTax: number;
}

export const LIABILITY_CASES: LiabilityCase[] = [
  {
    name: "$48M cash, single",
    winnings: 48000000,
    filingStatus: "single",
    expectedTaxable: 47983900,
    expectedTax: 17710000.25,
  },
  {
    name: "$48M cash, married filing jointly",
    winnings: 48000000,
    filingStatus: "married_jointly",
    // taxable = 48,000,000 - 32,200 = 47,967,800
    // MFJ base through $768,700: compute below; 37% on (47,967,800-768,700)
    expectedTaxable: 47967800,
    expectedTax: 206583.5 + (47967800 - 768700) * 0.37,
  },
  {
    name: "$1M cash, single",
    winnings: 1000000,
    filingStatus: "single",
    expectedTaxable: 983900,
    expectedTax: 320000.25,
  },
  {
    name: "winnings below standard deduction",
    winnings: 10000,
    filingStatus: "single",
    expectedTaxable: 0,
    expectedTax: 0,
  },
];
