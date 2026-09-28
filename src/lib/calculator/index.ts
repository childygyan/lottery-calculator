/** Central entry point for the calculator engine. UI imports from here. */
export {
  calculateLotteryWinnings,
  validateLotteryForm,
  MAX_JACKPOT_USD,
  ANNUITY_YEARS,
  DEFAULT_TAX_YEAR,
} from "./lottery.ts";
export type {
  LotteryCalculatorInput,
  LotteryFormValues,
  LotteryFieldErrors,
  LotteryValidation,
} from "./lottery.ts";
export { calculateProgressiveTax, calculateTaxableIncome, calculateFederalTaxLiability } from "./federal-tax.ts";
export { calculateStateTaxLiability } from "./state-tax.ts";
export { calculateWithholding } from "./withholding.ts";
export { annualAnnuityPayment, annuitySchedule } from "./annuity.ts";
export {
  roundToCents,
  formatCurrency,
  formatCurrencyExact,
  formatPercent,
  parseCurrencyInput,
} from "./formatting.ts";
export {
  FILING_STATUSES,
  FILING_STATUS_LABELS,
  isFilingStatus,
  friendlyRuleStatus,
} from "./types.ts";
export type {
  FilingStatus,
  PayoutChoice,
  TaxYear,
  TaxBracket,
  RuleStatus,
  StateTaxTreatment,
  StateTaxCalculationType,
  FederalTaxRule,
  StateTaxRule,
  WithholdingResult,
  LotteryCalculationResult,
} from "./types.ts";
