/** Central entry point for the calculator engine. UI imports from here. */
export {
  calculateLotteryWinnings,
  validateLotteryForm,
  parseAmountField,
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
  buildAnnuitySchedule,
  calculateAnnuityTaxes,
  validateAnnuityScheduleInput,
  MAX_ANNUITY_PAYMENTS,
} from "./annuities.ts";
export type {
  AnnuityScheduleInput,
  AnnuityPayment,
  ValidAnnuitySchedule,
  AnnuityTaxInput,
  AnnuityPaymentTax,
  AnnuityTaxResult,
} from "./annuities.ts";
export {
  calculatePayoutComparison,
  validatePayoutForm,
  parseShareableAmount,
  DEFAULT_ANNUITY_YEARS,
  MAX_PAYOUT_ANNUITY_YEARS,
} from "./payout.ts";
export type {
  PayoutFormValues,
  PayoutFieldErrors,
  PayoutValidation,
  ParsedPayoutInput,
  PayoutSideResult,
  PayoutComparison,
} from "./payout.ts";
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
export {
  calculateCombinations,
  calculateJackpotCombinations,
  calculateOdds,
  calculateProbability,
  calculateAtLeastOneWin,
  calculateExpectedTickets,
  calculateExpectedCost,
  calculateTicketCost,
  calculateCustomLotteryOdds,
  validateLotteryOddsConfig,
  lotteryOddsConfigFromGame,
  formatOneInX,
  formatTinyPercent,
  formatWholeNumber,
  MAX_NUMBER_POOL,
  MAX_TICKET_COUNT,
} from "./odds.ts";
export type { LotteryOddsConfig, CustomLotteryOddsInput } from "./odds.ts";
