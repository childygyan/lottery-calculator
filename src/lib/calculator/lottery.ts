/**
 * Lottery winnings calculation engine.
 * Pure, unit-test-friendly functions. No DOM access — the UI calls these.
 *
 * One normalized result object powers every calculator surface
 * (homepage, calculator pages, future state pages, Powerball/Mega Millions).
 */
import { DEFAULT_TAX_YEAR, isSupportedTaxYear } from "../../data/taxes/federal/index.ts";
import { getStateTaxRule } from "../../data/taxes/states/index.ts";
import { annualAnnuityPayment, ANNUITY_YEARS } from "./annuity.ts";
import { calculateFederalTaxLiability } from "./federal-tax.ts";
import { formatCurrencyExact, parseCurrencyInput, roundToCents } from "./formatting.ts";
import { calculateStateTaxLiability } from "./state-tax.ts";
import type {
  FilingStatus,
  LotteryCalculationResult,
  PayoutChoice,
  TaxYear,
} from "./types.ts";
import { FILING_STATUS_LABELS, isFilingStatus } from "./types.ts";
import { calculateWithholding } from "./withholding.ts";

export { ANNUITY_YEARS, DEFAULT_TAX_YEAR };

/** Sanity cap for inputs — well above any real jackpot, catches typos. */
export const MAX_JACKPOT_USD = 10_000_000_000;

export interface LotteryCalculatorInput {
  advertisedJackpot: number;
  /** Cash option (lump sum). Required when payoutChoice is "lump_sum". */
  cashValue: number;
  payoutChoice: PayoutChoice;
  state: string;
  taxYear: TaxYear;
  filingStatus: FilingStatus;
}

/**
 * Estimate taxes and take-home amount for lottery winnings.
 *
 * - Lump sum: the cash option is the taxable amount (received in one year).
 * - Annuity: each annual payment is taxed in the year received; the estimate
 *   uses one annual payment as the taxable amount.
 * - Take-home = taxable amount − estimated tax LIABILITY (not withholding).
 *   Withholding is reported separately — it is credited against the liability.
 */
export function calculateLotteryWinnings(
  input: LotteryCalculatorInput,
): LotteryCalculationResult {
  const taxYear = isSupportedTaxYear(input.taxYear) ? input.taxYear : DEFAULT_TAX_YEAR;
  const filingStatus: FilingStatus = isFilingStatus(input.filingStatus)
    ? input.filingStatus
    : "single";
  const stateCode = input.state.trim().toUpperCase();
  const payoutChoice: PayoutChoice = input.payoutChoice === "annuity" ? "annuity" : "lump_sum";

  const advertisedJackpot = roundToCents(Math.max(0, input.advertisedJackpot || 0));
  const cashValue = roundToCents(Math.max(0, input.cashValue || 0));
  const annualPayment = annualAnnuityPayment(advertisedJackpot, ANNUITY_YEARS);

  // The amount actually received (and withheld on) this year.
  const payoutAmount = payoutChoice === "annuity" ? annualPayment : cashValue;
  // The amount tax is estimated on. For a lump sum these are the same.
  const taxableAmount = roundToCents(payoutAmount);

  const federal = calculateFederalTaxLiability(taxableAmount, taxYear, filingStatus);
  const state = calculateStateTaxLiability(taxableAmount, taxYear, stateCode);
  const totalEstimatedTax = roundToCents(federal.tax + state.tax);

  const withholding = calculateWithholding(payoutAmount, taxYear, filingStatus, stateCode);

  const estimatedTakeHome = roundToCents(Math.max(0, taxableAmount - totalEstimatedTax));
  const estimatedEffectiveTaxRate = taxableAmount > 0 ? totalEstimatedTax / taxableAmount : 0;

  const statusLabel = FILING_STATUS_LABELS[filingStatus];
  const basis =
    payoutChoice === "annuity"
      ? `one annual annuity payment (${formatCurrencyExact(annualPayment)})`
      : `the cash option (${formatCurrencyExact(cashValue)})`;

  return {
    advertisedJackpot,
    cashValue,
    payoutChoice,
    annualAnnuityPayment: payoutChoice === "annuity" ? annualPayment : 0,
    annuityYears: ANNUITY_YEARS,
    taxableAmount,
    taxYear,
    state: stateCode,
    filingStatus,
    federalTax: federal.tax,
    stateTax: state.tax,
    totalEstimatedTax,
    federalWithholding: withholding.federalWithholding,
    stateWithholding: withholding.stateWithholding,
    totalWithholding: withholding.totalWithholding,
    estimatedTakeHome,
    estimatedEffectiveTaxRate,
    stateDataStatus: state.rule?.status ?? "not_supported",
    methodology:
      `Federal tax estimated with ${taxYear} IRS ${statusLabel.toLowerCase()} brackets applied to ${basis} minus the standard deduction; ` +
      `state tax estimated at the state's configured planning rate. ` +
      `Withholding (24% federal on payouts over $5,000) is credited against the final liability, not added to it. Planning estimates only.`,
  };
}

/* ------------------------------ Validation ------------------------------ */

export interface LotteryFormValues {
  jackpot: string;
  cashValue: string;
  payoutChoice: string;
  state: string;
  taxYear: string;
  filingStatus: string;
}

export interface LotteryFieldErrors {
  jackpot?: string;
  cashValue?: string;
  state?: string;
  taxYear?: string;
  filingStatus?: string;
}

export interface LotteryValidation {
  valid: boolean;
  errors: LotteryFieldErrors;
  parsed?: {
    advertisedJackpot: number;
    cashValue: number;
    payoutChoice: PayoutChoice;
    state: string;
    taxYear: TaxYear;
    filingStatus: FilingStatus;
  };
}

/**
 * Parse one currency form field. Exported so the payout calculator can reuse
 * the same validation (no duplicated parsing logic).
 */
export function parseAmountField(
  raw: string,
  fieldLabel: string,
  max: number,
): { value?: number; error?: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { error: `${fieldLabel} is required.` };
  if (trimmed.includes("-")) return { error: `${fieldLabel} must not be negative.` };
  // parseCurrencyInput accepts "$", commas, spaces and up to 2 decimals.
  const parsed = parseCurrencyInput(trimmed);
  if (parsed === null) {
    return { error: `Enter a valid dollar amount for the ${fieldLabel.toLowerCase()}.` };
  }
  if (!Number.isFinite(parsed)) return { error: `${fieldLabel} is too large to calculate.` };
  if (parsed === 0) return { error: `${fieldLabel} must be greater than $0.` };
  if (parsed > max) {
    return {
      error: `${fieldLabel} looks unusually large — please check the amount (maximum ${formatCurrencyExact(max)}).`,
    };
  }
  return { value: parsed };
}

/**
 * Validate raw form strings. Never throws — returns friendly per-field messages.
 * Rejects: empty values, negatives, zero, non-numeric, NaN/Infinity, amounts
 * over the sanity cap, cash option above the jackpot, unknown states,
 * unsupported tax years, and unknown filing statuses.
 */
export function validateLotteryForm(values: LotteryFormValues): LotteryValidation {
  const errors: LotteryFieldErrors = {};

  const payoutChoice: PayoutChoice = values.payoutChoice === "annuity" ? "annuity" : "lump_sum";

  const jackpot = parseAmountField(values.jackpot, "Jackpot amount", MAX_JACKPOT_USD);
  if (jackpot.error) errors.jackpot = jackpot.error;

  let cashValue = 0;
  if (payoutChoice === "lump_sum") {
    const cash = parseAmountField(values.cashValue, "Cash option", MAX_JACKPOT_USD);
    if (cash.error) {
      errors.cashValue = cash.error;
    } else {
      cashValue = cash.value as number;
    }
  }

  const stateCode = values.state.trim().toUpperCase();
  const stateRule = getStateTaxRule(Number(values.taxYear) || DEFAULT_TAX_YEAR, stateCode);
  if (!stateRule) errors.state = "Please choose a state.";

  const taxYear = Number(values.taxYear);
  if (!isSupportedTaxYear(taxYear)) errors.taxYear = "Please choose a supported tax year.";

  const filingStatus: FilingStatus = isFilingStatus(values.filingStatus)
    ? values.filingStatus
    : "single";
  if (!isFilingStatus(values.filingStatus)) {
    errors.filingStatus = "Please choose a filing status.";
  }

  if (
    payoutChoice === "lump_sum" &&
    jackpot.value !== undefined &&
    cashValue > jackpot.value
  ) {
    errors.cashValue =
      "The cash option is usually lower than the advertised jackpot — please check both amounts.";
  }

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    parsed: valid
      ? {
          advertisedJackpot: jackpot.value as number,
          cashValue,
          payoutChoice,
          state: stateCode,
          taxYear: taxYear as TaxYear,
          filingStatus,
        }
      : undefined,
  };
}
