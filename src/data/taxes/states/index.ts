/**
 * State tax rule registry, keyed by tax year.
 *
 * Only registered years ship to the browser. Add a year by creating
 * states/<year>.ts and registering it here.
 */
import type { StateTaxRule, TaxYear } from "../../../lib/calculator/types.ts";
import { stateTaxRules2026 } from "./2026.ts";

const REGISTRY: Record<TaxYear, StateTaxRule[]> = {
  2026: stateTaxRules2026,
};

export function isSupportedStateTaxYear(year: unknown): year is TaxYear {
  return typeof year === "number" && year in REGISTRY;
}

/** All state rules for a tax year. Returns an empty array for unknown years. */
export function getStateTaxRules(taxYear: TaxYear): StateTaxRule[] {
  return REGISTRY[taxYear] ?? [];
}

/** Look up one state's rule for a tax year (code is case-insensitive). */
export function getStateTaxRule(taxYear: TaxYear, code: string): StateTaxRule | undefined {
  const normalized = code.trim().toUpperCase();
  return getStateTaxRules(taxYear).find((r) => r.code === normalized);
}

/** Ordered { code, name } pairs for dropdowns — keeps UI free of hard-coded lists. */
export function getStateOptions(taxYear: TaxYear): Array<{ code: string; name: string }> {
  return getStateTaxRules(taxYear).map(({ code, name }) => ({ code, name }));
}

/**
 * Skeleton for future programmatic state pages
 * (e.g. /lottery-tax-calculator/california/) — same engine, no duplicated logic.
 * Phase 3 will use this; no pages are generated in this phase.
 */
export interface StatePageContext {
  rule: StateTaxRule;
  /** URL slug for the state, e.g. "california", "new-york", "district-of-columbia". */
  slug: string;
}

export function getStatePageContexts(taxYear: TaxYear): StatePageContext[] {
  return getStateTaxRules(taxYear).map((rule) => ({
    rule,
    slug: rule.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  }));
}
