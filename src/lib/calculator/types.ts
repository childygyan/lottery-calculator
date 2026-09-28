/**
 * Central type model for the lottery tax engine.
 *
 * Every tax calculation knows its tax year, filing status, and state rule.
 * Adding a new tax year (2027, 2028, ...) means adding data files only —
 * no calculator logic changes.
 */

/** Supported individual filing statuses. Union, not arbitrary strings. */
export type FilingStatus =
  | "single"
  | "married_jointly"
  | "married_separately"
  | "head_of_household";

export const FILING_STATUSES: FilingStatus[] = [
  "single",
  "married_jointly",
  "married_separately",
  "head_of_household",
];

export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: "Single",
  married_jointly: "Married filing jointly",
  married_separately: "Married filing separately",
  head_of_household: "Head of household",
};

export function isFilingStatus(value: unknown): value is FilingStatus {
  return (
    typeof value === "string" &&
    (FILING_STATUSES as string[]).includes(value)
  );
}

/** A tax year, e.g. 2026. Tax rules are versioned by year — never assumed permanent. */
export type TaxYear = number;

/** How the winner takes the prize. */
export type PayoutChoice = "lump_sum" | "annuity";

/** One marginal tax bracket. Covers taxable income in (previousUpTo, upTo]. */
export interface TaxBracket {
  /** Upper bound of the bracket in USD; null for the top (open-ended) bracket. */
  upTo: number | null;
  /** Marginal rate as a decimal, e.g. 0.37 for 37%. */
  rate: number;
}

/** Verification lifecycle of a tax rule. Never exposed raw to users — see friendlyRuleStatus(). */
export type RuleStatus =
  | "verified"
  | "needs_verification"
  | "not_applicable"
  | "not_supported";

/**
 * How a state treats lottery winnings. Semantic, not just "rate = 0",
 * so future rule changes (new exemptions, lottery-specific taxes) are easy.
 */
export type StateTaxTreatment =
  | "ordinary_income"
  | "lottery_specific_tax"
  | "no_state_individual_income_tax"
  | "withholding_only"
  | "special_exemption"
  | "unknown";

/** How the state's tax number is derived. */
export type StateTaxCalculationType =
  | "top_marginal_estimate"
  | "flat_rate_estimate"
  | "bracket_schedule";

/** Federal tax rule for one filing status in one tax year. */
export interface FederalTaxRule {
  taxYear: TaxYear;
  filingStatus: FilingStatus;
  brackets: TaxBracket[];
  /** Standard deduction in USD for this filing status and year. */
  standardDeduction: number;
  /**
   * Mandatory federal withholding on gambling/lottery winnings over $5,000.
   * Withholding is credited against final liability — it is NOT the final tax.
   */
  withholdingRate: number;
  /** Winnings below this amount are generally not subject to mandatory withholding. */
  withholdingThreshold: number;
  effectiveDate: string;
  expirationDate: string | null;
  lastVerified: string;
  /** Reference into the source registry (src/data/sources.ts). */
  sourceId: string;
  status: RuleStatus;
  notes: string;
}

/** State tax rule for lottery winnings in one tax year. */
export interface StateTaxRule {
  /** Full state name, e.g. "California". */
  name: string;
  /** Two-letter postal code, e.g. "CA". "DC" for the District of Columbia. */
  code: string;
  taxYear: TaxYear;
  taxTreatment: StateTaxTreatment;
  /** Whether the state levies a broad individual income tax at all. */
  hasIndividualIncomeTax: boolean;
  taxCalculationType: StateTaxCalculationType;
  /**
   * Estimated rate applied to lottery winnings, as a decimal (0.109 = 10.9%).
   * For graduated states this is the top marginal rate used as a flat
   * planning estimate. Null when no rate applies (exempt / no income tax /
   * unverified).
   */
  rate: number | null;
  /**
   * Common state withholding rate on lottery winnings, as a decimal,
   * or null when it varies too much to state a single verified figure.
   */
  withholdingRate: number | null;
  effectiveDate: string;
  expirationDate: string | null;
  lastVerified: string;
  /** Reference into the source registry (src/data/sources.ts). */
  sourceId: string;
  status: RuleStatus;
  notes: string;
}

/** Withholding is reported separately from final estimated liability. */
export interface WithholdingResult {
  federalWithholding: number;
  /** Null when the state has no single verifiable withholding figure. */
  stateWithholding: number | null;
  totalWithholding: number;
}

/**
 * Normalized, serializable calculation result.
 * One object powers the homepage calculator, calculator pages, future state
 * pages, and future Powerball / Mega Millions calculators.
 */
export interface LotteryCalculationResult {
  advertisedJackpot: number;
  cashValue: number;
  payoutChoice: PayoutChoice;
  /** Annual annuity payment (advertisedJackpot / annuityYears), 0 for lump sum. */
  annualAnnuityPayment: number;
  annuityYears: number;
  /** The amount tax is actually estimated on. */
  taxableAmount: number;
  taxYear: TaxYear;
  state: string;
  filingStatus: FilingStatus;

  federalTax: number;
  stateTax: number;
  totalEstimatedTax: number;

  federalWithholding: number;
  /** Null when the state has no single verifiable withholding figure. */
  stateWithholding: number | null;
  totalWithholding: number;

  estimatedTakeHome: number;
  /** Effective total tax rate as a decimal (0.3721 = 37.21%). */
  estimatedEffectiveTaxRate: number;

  /** Was the state's data verified, or does it need verification? */
  stateDataStatus: RuleStatus;

  /** Short description of the estimation methodology. */
  methodology: string;
}

/** Friendly, non-technical wording for a rule status. */
export function friendlyRuleStatus(status: RuleStatus): string | null {
  switch (status) {
    case "verified":
      return null;
    case "needs_verification":
      return "State tax data for this calculation requires verification.";
    case "not_applicable":
      return "This state does not tax lottery winnings at the state level.";
    case "not_supported":
      return "State tax data for this state is not available yet.";
  }
}
