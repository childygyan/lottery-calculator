/**
 * Test fixtures for tax year 2026 state rules.
 *
 * VERIFIED_RATES mirrors the Tax Foundation's "State Individual Income Tax
 * Rates and Brackets, 2026" top marginal rates. Tests assert configured
 * rates match this table — these are verified values, not guesses.
 * West Virginia is intentionally absent: its 2026 rate is needs_verification.
 */
import type { StateTaxTreatment } from "../../src/lib/calculator/types.ts";

/** code -> verified top marginal rate (decimal). */
export const VERIFIED_RATES: Record<string, number> = {
  AL: 0.05,
  AZ: 0.025,
  AR: 0.039,
  CO: 0.044,
  CT: 0.0699,
  DE: 0.066,
  GA: 0.0519,
  HI: 0.11,
  ID: 0.053,
  IL: 0.0495,
  IN: 0.0295,
  IA: 0.038,
  KS: 0.0558,
  KY: 0.035,
  LA: 0.03,
  ME: 0.0715,
  MD: 0.065,
  MA: 0.09,
  MI: 0.0425,
  MN: 0.0985,
  MS: 0.04,
  MO: 0.047,
  MT: 0.0565,
  NE: 0.0455,
  NJ: 0.1075,
  NM: 0.059,
  NY: 0.109,
  NC: 0.0399,
  ND: 0.025,
  OH: 0.0275,
  OK: 0.045,
  OR: 0.099,
  PA: 0.0307,
  RI: 0.0599,
  SC: 0.06,
  UT: 0.045,
  VT: 0.0875,
  VA: 0.0575,
  WI: 0.0765,
  DC: 0.1075,
};

/** States with no individual income tax on lottery winnings. */
export const NO_TAX_STATES = ["AK", "FL", "NV", "NH", "SD", "TN", "TX", "WA", "WY"];

/** States with a lottery-specific exemption (not a zero rate). */
export const EXEMPT_STATES: Array<{ code: string; treatment: StateTaxTreatment }> = [
  { code: "CA", treatment: "special_exemption" },
];

/** All 51 jurisdictions that must have a configured rule. */
export const ALL_JURISDICTIONS = [
  ...Object.keys(VERIFIED_RATES),
  ...NO_TAX_STATES,
  ...EXEMPT_STATES.map((s) => s.code),
  "WV",
];
