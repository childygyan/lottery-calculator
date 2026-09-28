/**
 * State tax rules for lottery winnings, tax year 2026.
 *
 * Top marginal individual income tax rates per Tax Foundation, "State
 * Individual Income Tax Rates and Brackets, 2026" (as of January 1, 2026;
 * data current as of February 11, 2026).
 *
 * HONESTY RULES (enforced by tests):
 * - No invented rates. A rule whose rate or treatment is not verified is
 *   marked status: "needs_verification" — never filled with a guess.
 * - States with no individual income tax (and California's lottery
 *   exemption) are represented semantically via taxTreatment, not just
 *   rate = 0.
 * - Rates are PLANNING ESTIMATES: the top marginal rate applied flat to the
 *   winnings. Actual state tax depends on brackets, deductions, exemptions,
 *   credits, and local taxes.
 *
 * To add a tax year: create states/<year>.ts with the same shape and
 * register it in states/index.ts. No engine code changes needed.
 */
import type {
  RuleStatus,
  StateTaxCalculationType,
  StateTaxRule,
  StateTaxTreatment,
} from "../../../lib/calculator/types.ts";

const TAX_YEAR = 2026;
const EFFECTIVE_DATE = "2026-01-01";
const LAST_VERIFIED = "2026-09-28";
const DEFAULT_SOURCE = "tax-foundation-state-2026";

const DEFAULT_NOTES =
  "Top marginal individual income tax rate applied as a flat planning estimate. Actual tax depends on brackets, deductions, exemptions, credits, and local taxes.";
const FLAT_NOTES =
  "Flat individual income tax rate, applied as a planning estimate. Local taxes, if any, are not included.";
const NO_TAX_NOTES =
  "No state individual income tax. Federal tax still applies to lottery winnings.";

interface RuleSpec {
  name: string;
  code: string;
  taxTreatment: StateTaxTreatment;
  incomeTaxApplicable: boolean;
  lotteryTaxApplicable: boolean;
  withholdingApplicable: boolean;
  taxCalculationType: StateTaxCalculationType;
  taxRate: number | null;
  withholdingRate?: number | null;
  sourceId?: string;
  status?: RuleStatus;
  notes?: string;
}

/** Central slug derivation — one rule, used by routes and sitemaps. */
export function stateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function buildRule(spec: RuleSpec): StateTaxRule {
  return {
    name: spec.name,
    code: spec.code,
    slug: stateSlug(spec.name),
    taxYear: TAX_YEAR,
    taxTreatment: spec.taxTreatment,
    incomeTaxApplicable: spec.incomeTaxApplicable,
    lotteryTaxApplicable: spec.lotteryTaxApplicable,
    withholdingApplicable: spec.withholdingApplicable,
    taxCalculationType: spec.taxCalculationType,
    taxRate: spec.taxRate,
    withholdingRate: spec.withholdingRate ?? null,
    effectiveDate: EFFECTIVE_DATE,
    expirationDate: null,
    lastVerified: LAST_VERIFIED,
    sourceId: spec.sourceId ?? DEFAULT_SOURCE,
    status: spec.status ?? "verified",
    notes: spec.notes ?? DEFAULT_NOTES,
  };
}

/** Graduated-rate state: top marginal rate used as a flat planning estimate. */
function graduated(name: string, code: string, taxRate: number, notes?: string): StateTaxRule {
  return buildRule({
    name,
    code,
    taxTreatment: "ordinary_income",
    incomeTaxApplicable: true,
    lotteryTaxApplicable: true,
    withholdingApplicable: false,
    taxCalculationType: "top_marginal_estimate",
    taxRate,
    notes,
  });
}

/** Flat-rate state. */
function flat(name: string, code: string, taxRate: number, notes?: string): StateTaxRule {
  return buildRule({
    name,
    code,
    taxTreatment: "ordinary_income",
    incomeTaxApplicable: true,
    lotteryTaxApplicable: true,
    withholdingApplicable: false,
    taxCalculationType: "flat_rate_estimate",
    taxRate,
    notes: notes ?? FLAT_NOTES,
  });
}

/** No broad individual income tax. */
function noTax(name: string, code: string, sourceId?: string, notes?: string): StateTaxRule {
  return buildRule({
    name,
    code,
    taxTreatment: "no_state_individual_income_tax",
    incomeTaxApplicable: false,
    lotteryTaxApplicable: false,
    withholdingApplicable: false,
    taxCalculationType: "flat_rate_estimate",
    taxRate: null,
    sourceId,
    status: "not_applicable",
    notes: notes ?? NO_TAX_NOTES,
  });
}

export const stateTaxRules2026: StateTaxRule[] = [
  graduated("Alabama", "AL", 0.05),
  noTax("Alaska", "AK"),
  flat("Arizona", "AZ", 0.025),
  graduated("Arkansas", "AR", 0.039),
  buildRule({
    name: "California",
    code: "CA",
    taxTreatment: "special_exemption",
    incomeTaxApplicable: true,
    lotteryTaxApplicable: false,
    withholdingApplicable: false,
    taxCalculationType: "flat_rate_estimate",
    taxRate: null,
    sourceId: "ca-lottery-exemption",
    status: "not_applicable",
    notes:
      "California exempts California Lottery winnings from state individual income tax. Federal tax still applies.",
  }),
  flat("Colorado", "CO", 0.044),
  graduated("Connecticut", "CT", 0.0699),
  graduated("Delaware", "DE", 0.066),
  noTax("Florida", "FL"),
  flat("Georgia", "GA", 0.0519),
  graduated("Hawaii", "HI", 0.11),
  flat("Idaho", "ID", 0.053),
  flat("Illinois", "IL", 0.0495),
  flat("Indiana", "IN", 0.0295),
  flat("Iowa", "IA", 0.038),
  graduated("Kansas", "KS", 0.0558),
  flat("Kentucky", "KY", 0.035),
  flat("Louisiana", "LA", 0.03),
  graduated("Maine", "ME", 0.0715),
  graduated(
    "Maryland",
    "MD",
    0.065,
    "Top marginal state rate applied as a flat planning estimate. Maryland counties levy additional local income taxes (not included). Actual tax depends on brackets, deductions, and exemptions.",
  ),
  graduated(
    "Massachusetts",
    "MA",
    0.09,
    "Top rate of 9% includes the 4% surtax on income over $1,083,150, applied as a flat planning estimate.",
  ),
  flat("Michigan", "MI", 0.0425),
  graduated("Minnesota", "MN", 0.0985),
  graduated("Mississippi", "MS", 0.04, "4% on taxable income over $10,000, applied as a planning estimate."),
  graduated("Missouri", "MO", 0.047),
  graduated("Montana", "MT", 0.0565),
  graduated("Nebraska", "NE", 0.0455),
  noTax("Nevada", "NV"),
  noTax("New Hampshire", "NH", "nh-no-income-tax", "New Hampshire repealed its interest and dividends tax effective 2025 and levies no broad individual income tax. Federal tax still applies."),
  graduated("New Jersey", "NJ", 0.1075),
  graduated("New Mexico", "NM", 0.059),
  graduated(
    "New York",
    "NY",
    0.109,
    "Top marginal state rate applied as a flat planning estimate. New York City and Yonkers levy additional local income taxes (not included).",
  ),
  flat("North Carolina", "NC", 0.0399),
  graduated("North Dakota", "ND", 0.025),
  graduated("Ohio", "OH", 0.0275, "2.75% on income over $26,050, applied as a planning estimate. Local (municipal) income taxes are not included."),
  graduated("Oklahoma", "OK", 0.045),
  graduated("Oregon", "OR", 0.099),
  flat("Pennsylvania", "PA", 0.0307, "Flat individual income tax rate, applied as a planning estimate. Local earned-income taxes are not included."),
  graduated("Rhode Island", "RI", 0.0599),
  graduated("South Carolina", "SC", 0.06),
  noTax("South Dakota", "SD"),
  noTax("Tennessee", "TN"),
  noTax("Texas", "TX"),
  flat("Utah", "UT", 0.045),
  graduated("Vermont", "VT", 0.0875),
  graduated("Virginia", "VA", 0.0575),
  noTax(
    "Washington",
    "WA",
    "wa-no-income-tax",
    "Washington levies no individual income tax on lottery winnings. Its capital-gains excise tax applies only to capital gains of high earners, not lottery prizes. Federal tax still applies.",
  ),
  buildRule({
    name: "West Virginia",
    code: "WV",
    taxTreatment: "ordinary_income",
    incomeTaxApplicable: true,
    lotteryTaxApplicable: true,
    withholdingApplicable: false,
    taxCalculationType: "top_marginal_estimate",
    taxRate: 0.0482,
    sourceId: "wv-sb392-unverified",
    status: "needs_verification",
    notes:
      "Rate shown (4.82%) is the Tax Foundation's published 2026 top rate, but reports of further 2026 legislation (SB 392) are not confirmed against an authoritative source. Verify with the WV State Tax Department before relying on this figure.",
  }),
  graduated("Wisconsin", "WI", 0.0765),
  noTax("Wyoming", "WY"),
  graduated("District of Columbia", "DC", 0.1075),
];
