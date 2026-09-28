/**
 * Federal tax engine. Pure functions — no DOM, no I/O.
 * All rates come from the centralized config in src/data/taxes/federal/.
 */
import { getFederalTaxRule } from "../../data/taxes/federal/index.ts";
import type {
  FederalTaxRule,
  FilingStatus,
  TaxBracket,
  TaxYear,
} from "./types.ts";
import { roundToCents } from "./formatting.ts";

/**
 * Reusable progressive (marginal-rate) tax calculator.
 *
 * Each bracket covers taxable income in (previousUpTo, upTo]. Handles:
 * - zero income -> 0
 * - income below the first bracket cap
 * - income exactly at a bracket boundary (taxed at the lower bracket's rate)
 * - income between brackets
 * - extremely high income (open-ended top bracket)
 *
 * Result is rounded to cents once, at the end.
 */
export function calculateProgressiveTax(income: number, brackets: TaxBracket[]): number {
  if (!Number.isFinite(income) || income <= 0) return 0;
  let tax = 0;
  let lowerBound = 0;
  for (const bracket of brackets) {
    if (income <= lowerBound) break;
    const cap = bracket.upTo ?? Number.POSITIVE_INFINITY;
    const taxableInBracket = Math.min(income, cap) - lowerBound;
    if (taxableInBracket > 0) tax += taxableInBracket * bracket.rate;
    lowerBound = cap;
    if (income <= cap) break;
  }
  return roundToCents(tax);
}

/**
 * Federal taxable income from gross lottery winnings.
 *
 * Planning estimate: subtracts the standard deduction for the filing status
 * (never below zero). Ignores other income, itemized deductions, credits,
 * AMT, and the net investment income tax.
 */
export function calculateTaxableIncome(
  grossWinnings: number,
  rule: FederalTaxRule,
): number {
  if (!Number.isFinite(grossWinnings) || grossWinnings <= 0) return 0;
  return roundToCents(Math.max(0, grossWinnings - rule.standardDeduction));
}

/**
 * Estimated federal income tax liability on lottery winnings.
 *
 * Applies the filing-status brackets to (winnings - standard deduction).
 * This is the estimated final liability — NOT withholding.
 */
export function calculateFederalTaxLiability(
  grossWinnings: number,
  taxYear: TaxYear,
  filingStatus: FilingStatus,
): { tax: number; taxableIncome: number; rule: FederalTaxRule | undefined } {
  const rule = getFederalTaxRule(taxYear, filingStatus);
  if (!rule || !Number.isFinite(grossWinnings) || grossWinnings <= 0) {
    return { tax: 0, taxableIncome: 0, rule };
  }
  const taxableIncome = calculateTaxableIncome(grossWinnings, rule);
  const tax = calculateProgressiveTax(taxableIncome, rule.brackets);
  return { tax, taxableIncome, rule };
}
