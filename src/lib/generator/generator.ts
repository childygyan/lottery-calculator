/**
 * Lottery number generator — pure random-combination logic, no UI.
 *
 * This is a random-number utility only: it draws uniform random combinations
 * from a game's number pools. Generated numbers do not improve the
 * mathematical odds of winning and cannot predict future winning numbers.
 *
 * Randomness is injected via `RandomSource` (see random.ts) so tests can
 * pass a deterministic source. Production callers use cryptoRandomSource().
 *
 * Total-combination math reuses Phase 6's `calculateCombinations()` —
 * no duplicate combination logic lives here.
 */
import {
  calculateCombinations,
  MAX_NUMBER_POOL,
} from "../calculator/odds.ts";
import type { LotteryConfig } from "../../data/lotteries/types.ts";
import { cryptoRandomSource, type RandomSource } from "./random.ts";
import {
  MAX_SETS_PER_REQUEST,
  TOO_MANY_COMBINATIONS_MESSAGE,
  type GenerateTicketsOptions,
  type GenerateTicketsResult,
  type GeneratedTicket,
  type GeneratorGameConfig,
} from "./types.ts";

export { MAX_SETS_PER_REQUEST, TOO_MANY_COMBINATIONS_MESSAGE };

function isPositiveInt(v: number): boolean {
  return Number.isInteger(v) && v > 0;
}

function isNonNegativeInt(v: number): boolean {
  return Number.isInteger(v) && v >= 0;
}

/**
 * Derive a generator config from the centralized verified LotteryConfig.
 * Game rules are never hard-coded in UI components — they flow from here.
 */
export function generatorConfigFromLotteryConfig(game: LotteryConfig): GeneratorGameConfig {
  return {
    gameName: game.name,
    mainNumbersToPick: game.mainNumbers,
    mainNumberPool: game.mainNumberRange.max,
    mainBallName: game.mainBallName,
    // The centralized configs model exactly one bonus ball per game.
    bonusNumbersToPick: 1,
    bonusNumberPool: game.bonusNumberRange.max,
    bonusNumberName: game.bonusNumberName,
    ticketPrice: game.ticketPrice,
  };
}

/** Validate a generator config; returns an error message or null when valid. */
export function validateGeneratorConfig(config: GeneratorGameConfig): string | null {
  if (!isPositiveInt(config.mainNumbersToPick)) {
    return "Main numbers per ticket must be a positive whole number.";
  }
  if (!isPositiveInt(config.mainNumberPool)) {
    return "The main number pool must be a positive whole number.";
  }
  if (config.mainNumberPool > MAX_NUMBER_POOL) {
    return `The main number pool is too large (maximum ${MAX_NUMBER_POOL.toLocaleString("en-US")}).`;
  }
  if (config.mainNumbersToPick > config.mainNumberPool) {
    return "You cannot pick more main numbers than the pool contains.";
  }
  if (!isNonNegativeInt(config.bonusNumbersToPick)) {
    return "Bonus balls per ticket must be a whole number (0 for none).";
  }
  if (config.bonusNumbersToPick > 0) {
    if (!isPositiveInt(config.bonusNumberPool)) {
      return "The bonus number pool must be a positive whole number.";
    }
    if (config.bonusNumberPool > MAX_NUMBER_POOL) {
      return `The bonus number pool is too large (maximum ${MAX_NUMBER_POOL.toLocaleString("en-US")}).`;
    }
    if (config.bonusNumbersToPick > config.bonusNumberPool) {
      return "You cannot pick more bonus balls than the bonus pool contains.";
    }
  }
  return null;
}

/**
 * Total distinct tickets the config can produce:
 * C(mainPool, mainPick) × C(bonusPool, bonusPick).
 * Returns null when the exact total exceeds safe-integer range.
 */
export function totalCombinationsFor(config: GeneratorGameConfig): number | null {
  const main = calculateCombinations(config.mainNumberPool, config.mainNumbersToPick);
  if (!main.ok) return null;
  if (config.bonusNumbersToPick === 0) return main.value;
  const bonus = calculateCombinations(config.bonusNumberPool, config.bonusNumbersToPick);
  if (!bonus.ok) return null;
  const total = main.value * bonus.value;
  return Number.isSafeInteger(total) ? total : null;
}

/**
 * Draw `pick` distinct numbers from 1..`pool` using a partial Fisher–Yates
 * shuffle, then sort ascending.
 */
function drawDistinct(pool: number, pick: number, rand: RandomSource): number[] {
  const arr: number[] = [];
  for (let i = 1; i <= pool; i++) arr.push(i);
  for (let i = 0; i < pick; i++) {
    const j = i + rand.nextInt(pool - i);
    const a = arr[i];
    const b = arr[j];
    if (a === undefined || b === undefined) {
      throw new Error("drawDistinct: index out of range (unreachable).");
    }
    arr[i] = b;
    arr[j] = a;
  }
  return arr.slice(0, pick).sort((a, b) => a - b);
}

/** Generate one ticket: sorted distinct main numbers + separate bonus ball(s). */
export function generateTicket(
  config: GeneratorGameConfig,
  rand: RandomSource = cryptoRandomSource(),
): GeneratedTicket {
  const mainNumbers = drawDistinct(config.mainNumberPool, config.mainNumbersToPick, rand);
  const bonusNumbers =
    config.bonusNumbersToPick > 0
      ? drawDistinct(config.bonusNumberPool, config.bonusNumbersToPick, rand)
      : [];
  return { mainNumbers, bonusNumbers };
}

function ticketKey(t: GeneratedTicket): string {
  return `${t.mainNumbers.join(",")}|${t.bonusNumbers.join(",")}`;
}

/**
 * Generate `count` tickets.
 *
 * - `count` must be an integer from 1 to MAX_SETS_PER_REQUEST (100).
 * - With `avoidDuplicates` (default), no two tickets share a combination.
 * - Never attempts more unique combinations than mathematically possible:
 *   the request is rejected up front with TOO_MANY_COMBINATIONS_MESSAGE, and
 *   an attempt cap guarantees no infinite loop.
 */
export function generateTickets(
  config: GeneratorGameConfig,
  count: number,
  options: GenerateTicketsOptions = {},
  rand: RandomSource = cryptoRandomSource(),
): GenerateTicketsResult {
  const configError = validateGeneratorConfig(config);
  if (configError) return { ok: false, error: configError };
  if (!Number.isInteger(count) || count < 1 || count > MAX_SETS_PER_REQUEST) {
    return {
      ok: false,
      error: `Please enter a number of sets between 1 and ${MAX_SETS_PER_REQUEST}.`,
    };
  }

  const avoidDuplicates = options.avoidDuplicates ?? true;
  const total = totalCombinationsFor(config);
  if (avoidDuplicates && total !== null && count > total) {
    return { ok: false, error: TOO_MANY_COMBINATIONS_MESSAGE };
  }

  const tickets: GeneratedTicket[] = [];
  const seen = new Set<string>();
  // Safety cap: with dedup on, retries stay bounded even if `total` is
  // unknown (overflow case). Without dedup, exactly `count` draws happen.
  const maxAttempts = avoidDuplicates ? count * 50 + 500 : count;
  let attempts = 0;
  while (tickets.length < count && attempts < maxAttempts) {
    attempts += 1;
    const ticket = generateTicket(config, rand);
    if (!avoidDuplicates) {
      tickets.push(ticket);
      continue;
    }
    const key = ticketKey(ticket);
    if (seen.has(key)) continue;
    seen.add(key);
    tickets.push(ticket);
  }
  if (tickets.length < count) {
    return { ok: false, error: TOO_MANY_COMBINATIONS_MESSAGE };
  }
  return { ok: true, tickets };
}

/** Render a ticket as text, e.g. "5 12 23 34 45 + PB 10". */
export function formatGeneratedTicket(
  ticket: GeneratedTicket,
  config: GeneratorGameConfig,
): string {
  const main = ticket.mainNumbers.join(" ");
  if (ticket.bonusNumbers.length === 0) return main;
  return `${main} + ${config.bonusNumberName} ${ticket.bonusNumbers.join(" ")}`;
}
