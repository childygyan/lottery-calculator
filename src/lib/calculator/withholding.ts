/**
 * Withholding engine — separate from final tax liability.
 *
 * Withholding is what the lottery holds back when you are paid. It is
 * credited against your final tax bill; it is NOT the final tax.
 * The calculator reports both so users can see the difference.
 */
import { getFederalTaxRule } from "../../data/taxes/federal/index.ts";
import { getStateTaxRule } from "../../data/taxes/states/index.ts";
import type { FilingStatus, TaxYear, WithholdingResult } from "./types.ts";
import { roundToCents } from "./formatting.ts";

/**
 * Estimated withholding on a lottery payout.
 *
 * Federal: 24% on winnings over $5,000 (IRS gambling-winnings rule).
 * State: the state's configured withholding rate, or null when no single
 * verified figure exists — null is reported as "varies / not available",
 * never silently treated as 0% withheld.
 */
export function calculateWithholding(
  payoutAmount: number,
  taxYear: TaxYear,
  filingStatus: FilingStatus,
  stateCode: string,
): WithholdingResult {
  if (!Number.isFinite(payoutAmount) || payoutAmount <= 0) {
    return { federalWithholding: 0, stateWithholding: null, totalWithholding: 0 };
  }

  const federalRule = getFederalTaxRule(taxYear, filingStatus);
  const federalWithholding =
    federalRule && payoutAmount > federalRule.withholdingThreshold
      ? roundToCents(payoutAmount * federalRule.withholdingRate)
      : 0;

  const stateRule = getStateTaxRule(taxYear, stateCode);
  const stateWithholding =
    stateRule &&
    stateRule.withholdingRate !== null &&
    stateRule.withholdingRate > 0
      ? roundToCents(payoutAmount * stateRule.withholdingRate)
      : null;

  return {
    federalWithholding,
    stateWithholding,
    totalWithholding: roundToCents(federalWithholding + (stateWithholding ?? 0)),
  };
}
