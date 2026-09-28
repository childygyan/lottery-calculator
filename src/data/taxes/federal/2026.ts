/**
 * Federal tax rules for tax year 2026.
 *
 * Brackets and standard deductions per IRS Revenue Procedure 2025-32
 * (announced October 2025; applies to returns filed in 2027).
 *
 * Cross-checked against: IRS Rev. Proc. 2025-32 reporting (Journal of
 * Accountancy, Intuit Tax Pro Center), Tax Foundation 2026 tables, and
 * Oblivious Investor. One known transcription trap was resolved against the
 * Revenue Procedure itself: head of household's 32% band opens at $201,750,
 * not $201,775 (that is single's number).
 *
 * To add a tax year: create federal/<year>.ts with the same shape and
 * register it in federal/index.ts. No engine code changes needed.
 */
import type { FederalTaxRule, FilingStatus, TaxBracket } from "../../../lib/calculator/types.ts";

const RATES: number[] = [0.1, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];

function brackets(caps: number[]): TaxBracket[] {
  // caps.length is always RATES.length - 1 by construction; ?? is type-level only.
  const body: TaxBracket[] = caps.map((upTo, i) => ({ upTo, rate: RATES[i] ?? 0 }));
  return [...body, { upTo: null, rate: RATES[RATES.length - 1] ?? 0.37 }];
}

const META = {
  taxYear: 2026,
  withholdingRate: 0.24,
  withholdingThreshold: 5000,
  effectiveDate: "2026-01-01",
  expirationDate: null as string | null,
  lastVerified: "2026-09-28",
  sourceId: "irs-rev-proc-2025-32",
  status: "verified" as const,
  notes:
    "Lottery winnings are taxed as ordinary income. Planning estimate: applies the filing-status brackets to the cash option minus the standard deduction; ignores other income, itemized deductions, credits, AMT, and the net investment income tax.",
} as const;

const RULES: Record<FilingStatus, FederalTaxRule> = {
  single: {
    ...META,
    filingStatus: "single",
    // 10% to $12,400; 12% to $50,400; 22% to $105,700; 24% to $201,775;
    // 32% to $256,225; 35% to $640,600; 37% above.
    brackets: brackets([12400, 50400, 105700, 201775, 256225, 640600]),
    standardDeduction: 16100,
  },
  married_jointly: {
    ...META,
    filingStatus: "married_jointly",
    // 10% to $24,800; 12% to $100,800; 22% to $211,400; 24% to $403,550;
    // 32% to $512,450; 35% to $768,700; 37% above.
    brackets: brackets([24800, 100800, 211400, 403550, 512450, 768700]),
    standardDeduction: 32200,
  },
  married_separately: {
    ...META,
    filingStatus: "married_separately",
    // Half of the married-jointly thresholds.
    // 10% to $12,400; 12% to $50,400; 22% to $105,700; 24% to $201,775;
    // 32% to $256,225; 35% to $384,350; 37% above.
    brackets: brackets([12400, 50400, 105700, 201775, 256225, 384350]),
    standardDeduction: 16100,
  },
  head_of_household: {
    ...META,
    filingStatus: "head_of_household",
    // 10% to $17,700; 12% to $67,450; 22% to $105,700; 24% to $201,750;
    // 32% to $256,200; 35% to $640,600; 37% above.
    brackets: brackets([17700, 67450, 105700, 201750, 256200, 640600]),
    standardDeduction: 24150,
  },
};

export const federalTaxRules2026: Record<FilingStatus, FederalTaxRule> = RULES;
