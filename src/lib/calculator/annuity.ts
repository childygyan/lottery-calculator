/**
 * Annuity model for lottery payouts.
 *
 * A lottery annuity pays the advertised jackpot in equal annual installments
 * (commonly 30 payments). Each annual payment is taxed as income in the year
 * it is received — not all at once. The cash option is the present value of
 * that payment stream (set by the lottery, not computed here).
 */
import { roundToCents } from "./formatting.ts";

/** Standard number of annual payments for U.S. lottery annuities. */
export const ANNUITY_YEARS = 30;

/**
 * Estimated annual payment for an annuity payout.
 * Simple equal-installment model: advertisedJackpot / years.
 */
export function annualAnnuityPayment(advertisedJackpot: number, years: number = ANNUITY_YEARS): number {
  if (!Number.isFinite(advertisedJackpot) || advertisedJackpot <= 0) return 0;
  if (!Number.isFinite(years) || years <= 0) return 0;
  return roundToCents(advertisedJackpot / years);
}

/**
 * Year-by-year payment schedule for an annuity (equal installments).
 * Useful for future per-year tax views; the calculator's headline estimate
 * uses the first annual payment as the taxable amount.
 */
export function annuitySchedule(
  advertisedJackpot: number,
  years: number = ANNUITY_YEARS,
): number[] {
  if (!Number.isFinite(advertisedJackpot) || advertisedJackpot <= 0) return [];
  if (!Number.isFinite(years) || years <= 0 || years > 100) return [];
  const payment = annualAnnuityPayment(advertisedJackpot, years);
  return Array.from({ length: Math.floor(years) }, () => payment);
}
