/**
 * Lottery odds + probability engine.
 *
 * Pure mathematics on validated inputs. Game rules are never hard-coded
 * here: jackpot combinations are derived from a LotteryOddsConfig, which
 * game pages build from the centralized, verified LotteryConfig
 * (see lotteryOddsConfigFromGame). Custom lotteries work the same way.
 *
 * Conventions:
 * - Validation never throws: every public function returns
 *   `{ ok: true, ... }` or `{ ok: false, error }`.
 * - C(n, r) uses the multiplicative formula (no factorial recursion) and
 *   stays exact while every intermediate value fits in Number.MAX_SAFE_INTEGER.
 *   Larger inputs get a controlled error state, never a silently wrong number.
 * - Multiple-ticket probability assumes independent tickets with distinct
 *   combinations (no duplicate coverage). Expected tickets/cost are
 *   mathematical expectations, never guarantees.
 */
import type { LotteryConfig } from "../../data/lotteries/types.ts";

/** Largest number pool accepted (protects against absurd inputs). */
export const MAX_NUMBER_POOL = 10_000;
/** Largest ticket count accepted for multiple-ticket math. */
export const MAX_TICKET_COUNT = 1_000_000_000;

/**
 * Generic lottery odds model. Future games (and user-defined lotteries)
 * are described with these five numbers — nothing game-specific here.
 */
export interface LotteryOddsConfig {
  /** Main numbers drawn per ticket, e.g. 5. Must be >= 1. */
  mainNumbersToPick: number;
  /** Main pool size (balls numbered 1..pool), e.g. 69. Must be >= picks. */
  mainNumberPool: number;
  /** Bonus balls drawn per ticket, e.g. 1. 0 = no bonus ball. */
  bonusNumbersToPick: number;
  /** Bonus pool size, e.g. 26. 0 when there is no bonus ball. */
  bonusNumberPool: number;
  /**
   * Verified ticket price in USD. Omit (undefined) when no verified price
   * exists — the UI must never invent one.
   */
  ticketPrice?: number;
}

/** Derive the odds model from a centralized, verified game config. */
export function lotteryOddsConfigFromGame(config: LotteryConfig): LotteryOddsConfig {
  return {
    mainNumbersToPick: config.mainNumbers,
    mainNumberPool: config.mainNumberRange.max - config.mainNumberRange.min + 1,
    bonusNumbersToPick: 1,
    bonusNumberPool: config.bonusNumberRange.max - config.bonusNumberRange.min + 1,
    ticketPrice: config.ticketPrice,
  };
}

/** Validate a LotteryOddsConfig. Never throws. */
export function validateLotteryOddsConfig(config: LotteryOddsConfig): {
  valid: boolean;
  error?: string;
} {
  const { mainNumbersToPick, mainNumberPool, bonusNumbersToPick, bonusNumberPool, ticketPrice } =
    config;
  for (const [label, v] of [
    ["main numbers to pick", mainNumbersToPick],
    ["main number pool", mainNumberPool],
    ["bonus numbers to pick", bonusNumbersToPick],
    ["bonus number pool", bonusNumberPool],
  ] as const) {
    if (!Number.isFinite(v) || !Number.isInteger(v)) {
      return { valid: false, error: `The ${label} must be a whole number.` };
    }
  }
  if (mainNumbersToPick < 1) {
    return { valid: false, error: "Pick at least 1 main number." };
  }
  if (mainNumberPool < 1) {
    return { valid: false, error: "The main number pool must contain at least 1 number." };
  }
  if (mainNumberPool > MAX_NUMBER_POOL) {
    return {
      valid: false,
      error: `Main number pools larger than ${MAX_NUMBER_POOL.toLocaleString("en-US")} are not supported.`,
    };
  }
  if (mainNumbersToPick > mainNumberPool) {
    return {
      valid: false,
      error: "You cannot pick more main numbers than the pool contains.",
    };
  }
  if (bonusNumbersToPick < 0) {
    return { valid: false, error: "The bonus ball count cannot be negative." };
  }
  if (bonusNumberPool < 0) {
    return { valid: false, error: "The bonus pool cannot be negative." };
  }
  if (bonusNumbersToPick === 0 && bonusNumberPool !== 0) {
    return {
      valid: false,
      error: "With no bonus ball, the bonus pool must be 0.",
    };
  }
  if (bonusNumbersToPick > 0) {
    if (bonusNumberPool > MAX_NUMBER_POOL) {
      return {
        valid: false,
        error: `Bonus pools larger than ${MAX_NUMBER_POOL.toLocaleString("en-US")} are not supported.`,
      };
    }
    if (bonusNumbersToPick > bonusNumberPool) {
      return {
        valid: false,
        error: "You cannot pick more bonus balls than the bonus pool contains.",
      };
    }
  }
  if (ticketPrice !== undefined && (!Number.isFinite(ticketPrice) || ticketPrice < 0)) {
    return { valid: false, error: "The ticket price must be $0 or more." };
  }
  return { valid: true };
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/**
 * C(n, r) — the number of ways to choose r numbers from a pool of n.
 * Multiplicative formula: C(n,r) = prod_{i=1..k} (n-k+i)/i with k = min(r, n-r).
 * Every intermediate value is an integer, so the result stays exact while it
 * fits in Number.MAX_SAFE_INTEGER; beyond that a controlled error is returned.
 */
export function calculateCombinations(
  n: number,
  r: number,
): { ok: true; value: number } | { ok: false; error: string } {
  if (!Number.isFinite(n) || !Number.isFinite(r)) {
    return fail("Both values must be numbers.");
  }
  if (!Number.isInteger(n) || !Number.isInteger(r)) {
    return fail("Combination inputs must be whole numbers.");
  }
  if (n < 0 || r < 0) {
    return fail("Combination inputs cannot be negative.");
  }
  if (r > n) {
    return fail("You cannot choose more numbers than the pool contains.");
  }
  if (n > MAX_NUMBER_POOL) {
    return fail(
      `Pools larger than ${MAX_NUMBER_POOL.toLocaleString("en-US")} are not supported.`,
    );
  }
  const k = Math.min(r, n - r);
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result = (result * (n - k + i)) / i;
    if (result > Number.MAX_SAFE_INTEGER) {
      return fail("The result is too large to calculate exactly.");
    }
  }
  return { ok: true, value: Math.round(result) };
}

/**
 * Jackpot combinations for a lottery: every main-ball combination times
 * every bonus-ball combination. For a game without a bonus ball this is
 * just C(mainPool, mainPick).
 */
export function calculateJackpotCombinations(
  config: LotteryOddsConfig,
): { ok: true; value: number } | { ok: false; error: string } {
  const v = validateLotteryOddsConfig(config);
  if (!v.valid) return fail(v.error as string);
  const main = calculateCombinations(config.mainNumberPool, config.mainNumbersToPick);
  if (!main.ok) return main;
  if (config.bonusNumbersToPick === 0) return main;
  const bonus = calculateCombinations(config.bonusNumberPool, config.bonusNumbersToPick);
  if (!bonus.ok) return bonus;
  const total = main.value * bonus.value;
  if (total > Number.MAX_SAFE_INTEGER) {
    return fail("The jackpot combination count is too large to calculate exactly.");
  }
  return { ok: true, value: total };
}

/** "1 in X" odds figure: X equals the number of possible combinations. */
export function calculateOdds(
  combinations: number,
): { ok: true; oneInX: number } | { ok: false; error: string } {
  if (!Number.isFinite(combinations) || !Number.isInteger(combinations) || combinations < 1) {
    return fail("Combinations must be a whole number of 1 or more.");
  }
  return { ok: true, oneInX: combinations };
}

/**
 * Probability of one specific combination being drawn: p = 1 / combinations.
 * Always within [0, 1].
 */
export function calculateProbability(
  combinations: number,
): { ok: true; probability: number } | { ok: false; error: string } {
  if (!Number.isFinite(combinations) || !Number.isInteger(combinations) || combinations < 1) {
    return fail("Combinations must be a whole number of 1 or more.");
  }
  return { ok: true, probability: 1 / combinations };
}

function validateTicketCount(ticketCount: number): string | null {
  if (!Number.isFinite(ticketCount) || !Number.isInteger(ticketCount)) {
    return "The number of tickets must be a whole number.";
  }
  if (ticketCount < 1) {
    return "Enter at least 1 ticket.";
  }
  if (ticketCount > MAX_TICKET_COUNT) {
    return `Ticket counts above ${MAX_TICKET_COUNT.toLocaleString("en-US")} are not supported.`;
  }
  return null;
}

function validateProbability(p: number): string | null {
  if (!Number.isFinite(p) || p <= 0 || p > 1) {
    return "The single-ticket probability must be greater than 0 and at most 1.";
  }
  return null;
}

/**
 * Chance of at least one jackpot win across n tickets: 1 - (1 - p)^n.
 * Assumes tickets cover distinct combinations (no duplicate tickets).
 * Exact while 1 - p is representable; falls back to the 1 - e^(-pn)
 * approximation only when p underflows double precision.
 */
export function calculateAtLeastOneWin(
  singleTicketProbability: number,
  ticketCount: number,
): { ok: true; probability: number } | { ok: false; error: string } {
  const pErr = validateProbability(singleTicketProbability);
  if (pErr) return fail(pErr);
  const cErr = validateTicketCount(ticketCount);
  if (cErr) return fail(cErr);
  const p = singleTicketProbability;
  const q = 1 - p;
  let result: number;
  if (q === 1) {
    // p is below double precision next to 1: use 1 - e^(-pn).
    result = 1 - Math.exp(-p * ticketCount);
  } else {
    result = 1 - Math.pow(q, ticketCount);
  }
  // Clamp floating-point dust to [0, 1].
  if (result < 0) result = 0;
  if (result > 1) result = 1;
  return { ok: true, probability: result };
}

/**
 * Mathematical expectation of tickets needed for one jackpot win: 1 / p.
 * An expectation, not a guarantee — half of all ticket-buyers would need
 * more, and buying this many tickets never assures a win.
 */
export function calculateExpectedTickets(
  singleTicketProbability: number,
): { ok: true; tickets: number } | { ok: false; error: string } {
  const pErr = validateProbability(singleTicketProbability);
  if (pErr) return fail(pErr);
  return { ok: true, tickets: 1 / singleTicketProbability };
}

/**
 * Expected spend for one jackpot win: (1 / p) * ticketPrice.
 * A mathematical expectation, never spending advice.
 */
export function calculateExpectedCost(
  singleTicketProbability: number,
  ticketPrice: number,
): { ok: true; cost: number } | { ok: false; error: string } {
  const pErr = validateProbability(singleTicketProbability);
  if (pErr) return fail(pErr);
  if (!Number.isFinite(ticketPrice) || ticketPrice < 0) {
    return fail("The ticket price must be $0 or more.");
  }
  return { ok: true, cost: (1 / singleTicketProbability) * ticketPrice };
}

/** Total spend for a ticket count: count * price. */
export function calculateTicketCost(
  ticketCount: number,
  ticketPrice: number,
): { ok: true; cost: number } | { ok: false; error: string } {
  const cErr = validateTicketCount(ticketCount);
  if (cErr) return fail(cErr);
  if (!Number.isFinite(ticketPrice) || ticketPrice < 0) {
    return fail("The ticket price must be $0 or more.");
  }
  return { ok: true, cost: ticketCount * ticketPrice };
}

export interface CustomLotteryOddsInput {
  config: LotteryOddsConfig;
  /** Tickets to evaluate for at-least-one-win and total cost. Defaults to 1. */
  ticketCount?: number;
}

/**
 * Full odds workup for any lottery described by a LotteryOddsConfig:
 * combinations, jackpot odds, single-ticket probability, multiple-ticket
 * probability, ticket cost, and expected tickets/cost. Derived, never
 * hard-coded — Powerball and Mega Millions flow through this same function.
 */
export function calculateCustomLotteryOdds(input: CustomLotteryOddsInput): (
  | {
      ok: true;
      combinations: number;
      oneInX: number;
      probability: number;
      atLeastOneWin: number;
      ticketCount: number;
      ticketCost: number | null;
      expectedTickets: number;
      expectedCost: number | null;
    }
  | { ok: false; error: string }
) {
  const { config } = input;
  const ticketCount = input.ticketCount ?? 1;
  const combos = calculateJackpotCombinations(config);
  if (!combos.ok) return combos;
  const prob = calculateProbability(combos.value);
  if (!prob.ok) return prob;
  const multi = calculateAtLeastOneWin(prob.probability, ticketCount);
  if (!multi.ok) return multi;
  const expected = calculateExpectedTickets(prob.probability);
  if (!expected.ok) return expected;

  let ticketCost: number | null = null;
  let expectedCost: number | null = null;
  if (config.ticketPrice !== undefined) {
    const cost = calculateTicketCost(ticketCount, config.ticketPrice);
    if (!cost.ok) return cost;
    ticketCost = cost.cost;
    const exp = calculateExpectedCost(prob.probability, config.ticketPrice);
    if (!exp.ok) return exp;
    expectedCost = exp.cost;
  }
  return {
    ok: true,
    combinations: combos.value,
    oneInX: combos.value,
    probability: prob.probability,
    atLeastOneWin: multi.probability,
    ticketCount,
    ticketCost,
    expectedTickets: expected.tickets,
    expectedCost,
  };
}

// -- Display formatting ------------------------------------------------

/** "1 in 292,201,338" — the odds figure with thousands separators. */
export function formatOneInX(oneInX: number): string {
  return `1 in ${Math.round(oneInX).toLocaleString("en-US")}`;
}

/**
 * Tiny probabilities as percentages with enough decimals to stay nonzero,
 * e.g. 0.000000342%. Falls back to exponential notation past 12 decimals.
 */
export function formatTinyPercent(probability: number): string {
  if (!(probability > 0)) return "0%";
  if (probability >= 1) return "100%";
  const percent = probability * 100;
  const decimals = Math.ceil(-Math.log10(percent)) + 2;
  if (decimals > 12) return `${percent.toExponential(2)}%`;
  return `${percent.toFixed(Math.max(decimals, 2))}%`;
}

/** Whole-number display with thousands separators, e.g. 292,201,338. */
export function formatWholeNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}
