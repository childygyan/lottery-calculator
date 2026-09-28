/**
 * Federal tax rule registry, keyed by tax year.
 *
 * Only registered years ship to the browser — historical years are never
 * bundled unless the UI offers them. Add a year by creating federal/<year>.ts
 * and registering it here.
 */
import type { FederalTaxRule, FilingStatus, TaxYear } from "../../../lib/calculator/types.ts";
import { federalTaxRules2026 } from "./2026.ts";

const REGISTRY: Record<TaxYear, Record<FilingStatus, FederalTaxRule>> = {
  2026: federalTaxRules2026,
};

/** Tax years the calculator can use, newest first. */
export const SUPPORTED_TAX_YEARS: TaxYear[] = Object.keys(REGISTRY)
  .map(Number)
  .sort((a, b) => b - a);

/** The newest supported tax year — the UI default. */
export const DEFAULT_TAX_YEAR: TaxYear = SUPPORTED_TAX_YEARS[0] ?? 2026; // registry is never empty

export function isSupportedTaxYear(year: unknown): year is TaxYear {
  return typeof year === "number" && year in REGISTRY;
}

/** Federal rule for a tax year + filing status. Returns undefined for unknown combos. */
export function getFederalTaxRule(
  taxYear: TaxYear,
  filingStatus: FilingStatus,
): FederalTaxRule | undefined {
  return REGISTRY[taxYear]?.[filingStatus];
}
