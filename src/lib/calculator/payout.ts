/**
 * Cash-vs-annuity payout comparison engine.
 *
 * Compares the lump-sum cash option against the annuity schedule for the
 * same advertised jackpot. Both sides use the existing tax engine:
 * - Cash: calculateLotteryWinnings with payoutChoice "lump_sum".
 * - Annuity: buildAnnuitySchedule + calculateAnnuityTaxes (each payment
 *   taxed in its year — never the cash-option tax applied to the total).
 *
 * The result presents numbers only. It never recommends one option over
 * the other — see FINANCIAL PRESENTATION RULE (no "better" language).
 */
import { DEFAULT_TAX_YEAR, isSupportedTaxYear } from "../../data/taxes/federal/index.ts";
import { getStateTaxRule } from "../../data/taxes/states/index.ts";
import {
  buildAnnuitySchedule,
  calculateAnnuityTaxes,
  MAX_ANNUITY_PAYMENTS,
} from "./annuities.ts";
import type { AnnuityTaxResult } from "./annuities.ts";
import { formatCurrencyExact, formatPercent, roundToCents } from "./formatting.ts";
import {
  calculateLotteryWinnings,
  MAX_JACKPOT_USD,
  parseAmountField,
} from "./lottery.ts";
import type {
  FilingStatus,
  LotteryCalculationResult,
  RuleStatus,
  TaxYear,
  WithholdingResult,
} from "./types.ts";
import { isFilingStatus } from "./types.ts";

/** Default annuity length when the user doesn't pick a game (years). */
export const DEFAULT_ANNUITY_YEARS = 30;
/** Upper bound offered by the payout UI (years). */
export const MAX_PAYOUT_ANNUITY_YEARS = 50;

export interface PayoutFormValues {
  jackpot: string;
  cashValue: string;
  annuityYears: string;
  /** Annual increase as a percentage string, e.g. "5" for 5%. */
  annualIncrease: string;
  state: string;
  taxYear: string;
  filingStatus: string;
}

export interface PayoutFieldErrors {
  jackpot?: string;
  cashValue?: string;
  annuityYears?: string;
  annualIncrease?: string;
  state?: string;
  taxYear?: string;
  filingStatus?: string;
}

export interface PayoutValidation {
  valid: boolean;
  errors: PayoutFieldErrors;
  parsed?: ParsedPayoutInput;
}

export interface ParsedPayoutInput {
  advertisedJackpot: number;
  cashValue: number;
  annuityYears: number;
  /** Annual increase as a decimal, e.g. 0.05. */
  annualIncrease: number;
  state: string;
  taxYear: TaxYear;
  filingStatus: FilingStatus;
}

/**
 * Validate raw payout form strings. Never throws. The cash option is
 * required and must not exceed the advertised jackpot — it is never
 * invented or defaulted from the jackpot.
 */
export function validatePayoutForm(values: PayoutFormValues): PayoutValidation {
  const errors: PayoutFieldErrors = {};

  const jackpot = parseAmountField(values.jackpot, "Jackpot amount", MAX_JACKPOT_USD);
  if (jackpot.error) errors.jackpot = jackpot.error;

  const cash = parseAmountField(values.cashValue, "Cash option", MAX_JACKPOT_USD);
  if (cash.error) {
    errors.cashValue = cash.error;
  } else if (jackpot.value !== undefined && (cash.value as number) > jackpot.value) {
    errors.cashValue =
      "The cash option is usually lower than the advertised jackpot — please check both amounts.";
  }

  let annuityYears = DEFAULT_ANNUITY_YEARS;
  const yearsRaw = values.annuityYears.trim();
  if (yearsRaw !== "") {
    const years = Number(yearsRaw);
    if (!Number.isInteger(years) || years < 1 || years > MAX_PAYOUT_ANNUITY_YEARS) {
      errors.annuityYears = `Enter a whole number of years between 1 and ${MAX_PAYOUT_ANNUITY_YEARS}.`;
    } else {
      annuityYears = years;
    }
  }

  let annualIncrease = 0;
  const increaseRaw = values.annualIncrease.trim();
  if (increaseRaw !== "") {
    const pct = Number(increaseRaw.replace("%", ""));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      errors.annualIncrease = "Enter an annual increase between 0% and 100%.";
    } else {
      annualIncrease = pct / 100;
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

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    parsed: valid
      ? {
          advertisedJackpot: jackpot.value as number,
          cashValue: cash.value as number,
          annuityYears,
          annualIncrease,
          state: stateCode,
          taxYear: taxYear as TaxYear,
          filingStatus,
        }
      : undefined,
  };
}

export interface PayoutSideResult {
  /** What the winner receives before tax. */
  gross: number;
  federalTax: number;
  stateTax: number;
  totalTax: number;
  net: number;
  /** totalTax / gross as a decimal. */
  effectiveRate: number;
  federalWithholding: number;
  stateWithholding: number | null;
  totalWithholding: number;
  paymentStructure: string;
}

export interface PayoutComparison {
  cash: PayoutSideResult;
  annuity: PayoutSideResult & {
    schedule: AnnuityTaxResult;
    firstPayment: number;
    lastPayment: number;
  };
  /** Plain-language assumptions behind the numbers. Never a recommendation. */
  assumptions: string[];
  stateDataStatus: RuleStatus;
}

/**
 * Compare cash option vs annuity for the same advertised jackpot.
 *
 * Deliberately contains no recommendation field — the UI presents gross,
 * taxes, timing, structure, and net, and lets the user interpret them.
 */
export function calculatePayoutComparison(input: ParsedPayoutInput): PayoutComparison {
  const cashResult: LotteryCalculationResult = calculateLotteryWinnings({
    advertisedJackpot: input.advertisedJackpot,
    cashValue: input.cashValue,
    payoutChoice: "lump_sum",
    state: input.state,
    taxYear: input.taxYear,
    filingStatus: input.filingStatus,
  });

  const schedule = buildAnnuitySchedule({
    totalAdvertisedValue: input.advertisedJackpot,
    numberOfPayments: Math.min(input.annuityYears, MAX_ANNUITY_PAYMENTS),
    paymentFrequency: "annual",
    growthRate: input.annualIncrease,
  });
  const annuityTaxes = calculateAnnuityTaxes({
    payments: schedule.map((p) => p.paymentAmount),
    state: input.state,
    filingStatus: input.filingStatus,
    taxYear: input.taxYear,
  });

  const cashWithholding: WithholdingResult = {
    federalWithholding: cashResult.federalWithholding,
    stateWithholding: cashResult.stateWithholding,
    totalWithholding: cashResult.totalWithholding,
  };

  const annuityWithholding: WithholdingResult = {
    federalWithholding: roundToCents(
      annuityTaxes.withholding.reduce((sum, w) => sum + w.federalWithholding, 0),
    ),
    stateWithholding:
      annuityTaxes.withholding.some((w) => w.stateWithholding === null)
        ? null
        : roundToCents(
            annuityTaxes.withholding.reduce(
              (sum, w) => sum + (w.stateWithholding ?? 0),
              0,
            ),
          ),
    totalWithholding: 0,
  };
  annuityWithholding.totalWithholding = roundToCents(
    annuityWithholding.federalWithholding + (annuityWithholding.stateWithholding ?? 0),
  );

  const firstPayment = schedule[0]?.paymentAmount ?? 0;
  const lastPayment = schedule[schedule.length - 1]?.paymentAmount ?? 0;
  const increaseLabel =
    input.annualIncrease > 0
      ? `, growing ${formatPercent(input.annualIncrease)} per year`
      : " (equal payments)";

  const assumptions = [
    `Annuity: ${input.annuityYears} annual payments totalling ${formatCurrencyExact(input.advertisedJackpot)}${input.annualIncrease > 0 ? increaseLabel : " in equal payments"}.`,
    `Cash option: ${formatCurrencyExact(input.cashValue)} paid at once, taxed in a single year.`,
    "Each annuity payment is taxed as that year's income using the same tax engine as the cash option.",
    "These are planning estimates, not tax or financial advice.",
  ];

  return {
    cash: {
      gross: cashResult.cashValue,
      federalTax: cashResult.federalTax,
      stateTax: cashResult.stateTax,
      totalTax: cashResult.totalEstimatedTax,
      net: cashResult.estimatedTakeHome,
      effectiveRate: cashResult.estimatedEffectiveTaxRate,
      federalWithholding: cashWithholding.federalWithholding,
      stateWithholding: cashWithholding.stateWithholding,
      totalWithholding: cashWithholding.totalWithholding,
      paymentStructure: "One-time payment",
    },
    annuity: {
      gross: annuityTaxes.totalGross,
      federalTax: annuityTaxes.totalFederalTax,
      stateTax: annuityTaxes.totalStateTax,
      totalTax: annuityTaxes.totalTax,
      net: annuityTaxes.totalNet,
      effectiveRate: annuityTaxes.averageEffectiveRate,
      federalWithholding: annuityWithholding.federalWithholding,
      stateWithholding: annuityWithholding.stateWithholding,
      totalWithholding: annuityWithholding.totalWithholding,
      paymentStructure: `${input.annuityYears} annual payments${input.annualIncrease > 0 ? increaseLabel : ""}`,
      schedule: annuityTaxes,
      firstPayment,
      lastPayment,
    },
    assumptions,
    stateDataStatus: cashResult.stateDataStatus,
  };
}

/**
 * Parse a shareable `?amount=` URL parameter into a jackpot amount.
 * Sanitizes aggressively: digits and one decimal point only, must be a
 * finite positive amount within the sanity cap. Returns null when invalid —
 * callers fall back to the page default.
 */
export function parseShareableAmount(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const text = String(raw);
  // Reject negative intent outright instead of stripping the minus sign.
  if (text.includes("-")) return null;
  const cleaned = text.replace(/[^0-9.]/g, "");
  if (cleaned === "" || (cleaned.match(/\./g) ?? []).length > 1) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_JACKPOT_USD) return null;
  return roundToCents(value);
}
