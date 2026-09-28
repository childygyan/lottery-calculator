/**
 * State tax engine. Pure functions — no DOM, no I/O.
 * All rules come from the centralized config in src/data/taxes/states/.
 *
 * The state estimate applies the rule's configured rate to the taxable
 * amount. For graduated states this is the top marginal rate used as a flat
 * planning estimate (taxCalculationType: "top_marginal_estimate"); flat-rate
 * states use their single rate. States that do not tax lottery winnings
 * (no_state_individual_income_tax / special_exemption) return 0.
 */
import { getStateTaxRule } from "../../data/taxes/states/index.ts";
import type { StateTaxRule, TaxYear } from "./types.ts";
import { roundToCents } from "./formatting.ts";

/**
 * Estimated state income tax on lottery winnings.
 * Returns 0 for states that do not tax lottery winnings, rules without a
 * rate, and non-finite/non-positive amounts. Never throws.
 */
export function calculateStateTaxLiability(
  taxableAmount: number,
  taxYear: TaxYear,
  stateCode: string,
): { tax: number; rule: StateTaxRule | undefined } {
  const rule = getStateTaxRule(taxYear, stateCode);
  if (!rule || !Number.isFinite(taxableAmount) || taxableAmount <= 0) {
    return { tax: 0, rule };
  }
  if (
    rule.taxTreatment === "no_state_individual_income_tax" ||
    rule.taxTreatment === "special_exemption" ||
    !rule.lotteryTaxApplicable ||
    rule.taxRate === null ||
    rule.taxRate <= 0
  ) {
    return { tax: 0, rule };
  }
  return { tax: roundToCents(taxableAmount * rule.taxRate), rule };
}
