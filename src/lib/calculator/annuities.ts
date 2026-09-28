/**
 * Generic annuity engine for lottery payouts.
 *
 * Builds payment schedules (fixed or growing, annual or monthly) and taxes
 * each payment with the EXISTING federal/state tax engines — no duplicated
 * tax logic. The advertised jackpot is the nominal total of all payments;
 * the cash option is always user-entered, never derived here.
 */
import { DEFAULT_TAX_YEAR, isSupportedTaxYear } from "../../data/taxes/federal/index.ts";
import { getStateTaxRule } from "../../data/taxes/states/index.ts";
import { calculateFederalTaxLiability } from "./federal-tax.ts";
import { roundToCents } from "./formatting.ts";
import { calculateStateTaxLiability } from "./state-tax.ts";
import type { FilingStatus, RuleStatus, TaxYear, WithholdingResult } from "./types.ts";
import { isFilingStatus } from "./types.ts";
import { calculateWithholding } from "./withholding.ts";

/** Hard cap on schedule length: 50 years of monthly payments. */
export const MAX_ANNUITY_PAYMENTS = 600;

export interface AnnuityScheduleInput {
  /** Nominal total of all payments (the advertised jackpot). Must be > 0. */
  totalAdvertisedValue: number;
  /** Number of payments, 1–600. */
  numberOfPayments: number;
  /** "annual" (default) or "monthly". */
  paymentFrequency?: "annual" | "monthly";
  /**
   * Per-period growth as a decimal (0.05 = each payment 5% larger than the
   * previous). 0 (default) = fixed equal payments.
   */
  growthRate?: number;
}

export interface AnnuityPayment {
  paymentNumber: number;
  paymentAmount: number;
  cumulativeAmount: number;
}

export interface ValidAnnuitySchedule {
  totalAdvertisedValue: number;
  numberOfPayments: number;
  paymentFrequency: "annual" | "monthly";
  growthRate: number;
}

/** Validate annuity schedule parameters. Never throws. */
export function validateAnnuityScheduleInput(
  input: AnnuityScheduleInput,
): { valid: boolean; parsed?: ValidAnnuitySchedule; error?: string } {
  const total = input.totalAdvertisedValue;
  if (!Number.isFinite(total) || total <= 0) {
    return { valid: false, error: "The annuity total must be greater than $0." };
  }
  const n = input.numberOfPayments;
  if (!Number.isInteger(n) || n < 1 || n > MAX_ANNUITY_PAYMENTS) {
    return {
      valid: false,
      error: `The number of payments must be a whole number between 1 and ${MAX_ANNUITY_PAYMENTS}.`,
    };
  }
  const frequency = input.paymentFrequency ?? "annual";
  if (frequency !== "annual" && frequency !== "monthly") {
    return { valid: false, error: "Payment frequency must be annual or monthly." };
  }
  const growth = input.growthRate ?? 0;
  if (!Number.isFinite(growth) || growth < 0 || growth >= 1) {
    return {
      valid: false,
      error: "The annual increase must be between 0% and 100%.",
    };
  }
  return {
    valid: true,
    parsed: {
      totalAdvertisedValue: roundToCents(total),
      numberOfPayments: n,
      paymentFrequency: frequency,
      growthRate: growth,
    },
  };
}

/**
 * Build a payment schedule for an annuity.
 *
 * - Fixed (growthRate = 0): every payment = total / n.
 * - Growing (growthRate > 0): geometric series — first payment is solved so
 *   the nominal total of all payments equals the advertised value:
 *   first = total * g / ((1 + g)^n − 1).
 * - Payments are rounded to cents; the final payment is adjusted so the
 *   cumulative total matches the advertised value exactly.
 *
 * Returns [] for invalid input (use validateAnnuityScheduleInput for messages).
 */
export function buildAnnuitySchedule(input: AnnuityScheduleInput): AnnuityPayment[] {
  const checked = validateAnnuityScheduleInput(input);
  if (!checked.valid || !checked.parsed) return [];
  const { totalAdvertisedValue, numberOfPayments, growthRate } = checked.parsed;

  const firstPayment =
    growthRate > 0
      ? (totalAdvertisedValue * growthRate) /
        (Math.pow(1 + growthRate, numberOfPayments) - 1)
      : totalAdvertisedValue / numberOfPayments;

  const payments: AnnuityPayment[] = [];
  let cumulative = 0;
  for (let i = 1; i <= numberOfPayments; i++) {
    let amount = roundToCents(firstPayment * Math.pow(1 + growthRate, i - 1));
    if (i === numberOfPayments) {
      // Adjust the final payment so the schedule totals exactly.
      amount = roundToCents(totalAdvertisedValue - cumulative);
    }
    cumulative = roundToCents(cumulative + amount);
    payments.push({ paymentNumber: i, paymentAmount: amount, cumulativeAmount: cumulative });
  }
  return payments;
}

/* ------------------------- Per-payment tax model ------------------------- */

export interface AnnuityTaxInput {
  /** Gross amount of each payment (one entry per payment). */
  payments: number[];
  state: string;
  filingStatus: FilingStatus;
  taxYear: TaxYear;
}

export interface AnnuityPaymentTax {
  paymentNumber: number;
  grossPayment: number;
  federalTax: number;
  stateTax: number;
  totalTax: number;
  /** totalTax / grossPayment as a decimal. */
  effectiveTaxRate: number;
  netPayment: number;
  cumulativeGross: number;
  cumulativeTax: number;
  cumulativeNet: number;
}

export interface AnnuityTaxResult {
  payments: AnnuityPaymentTax[];
  totalGross: number;
  totalFederalTax: number;
  totalStateTax: number;
  totalTax: number;
  totalNet: number;
  averageGross: number;
  averageTax: number;
  averageNet: number;
  /** totalTax / totalGross as a decimal. */
  averageEffectiveRate: number;
  stateDataStatus: RuleStatus;
  withholding: WithholdingResult[];
}

/**
 * Tax every annuity payment with the existing tax engine.
 *
 * Each payment is that year's taxable income, so federal tax uses the
 * progressive brackets + standard deduction and state tax uses the state's
 * configured planning rate — the same functions the lump-sum calculator
 * uses. Nothing here invents tax math.
 */
export function calculateAnnuityTaxes(input: AnnuityTaxInput): AnnuityTaxResult {
  const taxYear = isSupportedTaxYear(input.taxYear) ? input.taxYear : DEFAULT_TAX_YEAR;
  const filingStatus: FilingStatus = isFilingStatus(input.filingStatus)
    ? input.filingStatus
    : "single";
  const stateCode = input.state.trim().toUpperCase();

  const payments: AnnuityPaymentTax[] = [];
  let totalGross = 0;
  let totalFederalTax = 0;
  let totalStateTax = 0;
  const withholding: WithholdingResult[] = [];

  input.payments.forEach((rawPayment, index) => {
    const gross = roundToCents(Math.max(0, rawPayment || 0));
    const federal = calculateFederalTaxLiability(gross, taxYear, filingStatus);
    const state = calculateStateTaxLiability(gross, taxYear, stateCode);
    const totalTax = roundToCents(federal.tax + state.tax);
    const net = roundToCents(Math.max(0, gross - totalTax));

    totalGross = roundToCents(totalGross + gross);
    totalFederalTax = roundToCents(totalFederalTax + federal.tax);
    totalStateTax = roundToCents(totalStateTax + state.tax);

    payments.push({
      paymentNumber: index + 1,
      grossPayment: gross,
      federalTax: federal.tax,
      stateTax: state.tax,
      totalTax,
      effectiveTaxRate: gross > 0 ? totalTax / gross : 0,
      netPayment: net,
      cumulativeGross: totalGross,
      cumulativeTax: roundToCents(totalFederalTax + totalStateTax),
      cumulativeNet: roundToCents(totalGross - (totalFederalTax + totalStateTax)),
    });

    withholding.push(calculateWithholding(gross, taxYear, filingStatus, stateCode));
  });

  const totalTax = roundToCents(totalFederalTax + totalStateTax);
  const count = payments.length;
  const rule = getStateTaxRule(taxYear, stateCode);

  return {
    payments,
    totalGross,
    totalFederalTax,
    totalStateTax,
    totalTax,
    totalNet: roundToCents(totalGross - totalTax),
    averageGross: count > 0 ? roundToCents(totalGross / count) : 0,
    averageTax: count > 0 ? roundToCents(totalTax / count) : 0,
    averageNet: count > 0 ? roundToCents((totalGross - totalTax) / count) : 0,
    averageEffectiveRate: totalGross > 0 ? totalTax / totalGross : 0,
    stateDataStatus: rule?.status ?? "not_supported",
    withholding,
  };
}
