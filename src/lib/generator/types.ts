/**
 * Types for the lottery number generator.
 *
 * The generic model supports any lottery shape: N main numbers drawn from a
 * main pool, plus an optional bonus ball (or several) drawn from a separate
 * bonus pool. Game-specific rules always come from the centralized
 * LotteryConfig — see `generatorConfigFromLotteryConfig()` in generator.ts.
 */

export interface GeneratorGameConfig {
  /** Display name, e.g. "Powerball" or "Custom lottery". */
  gameName: string;
  /** How many main numbers each ticket holds, e.g. 5. */
  mainNumbersToPick: number;
  /** Main numbers run from 1 to this value, e.g. 69. */
  mainNumberPool: number;
  /** Display name for the main balls, e.g. "white balls". */
  mainBallName: string;
  /** How many bonus balls each ticket holds; 0 = no bonus ball. */
  bonusNumbersToPick: number;
  /** Bonus numbers run from 1 to this value (ignored when pick is 0). */
  bonusNumberPool: number;
  /** Display name for the bonus ball, e.g. "Powerball". */
  bonusNumberName: string;
  /** Verified ticket price in USD, when known. */
  ticketPrice?: number;
}

/** One generated ticket: sorted main numbers plus separate bonus ball(s). */
export interface GeneratedTicket {
  /** Main numbers, sorted ascending, no duplicates. */
  mainNumbers: number[];
  /** Bonus ball(s), kept separate from the main numbers. */
  bonusNumbers: number[];
}

export interface GenerateTicketsOptions {
  /**
   * Reject tickets that duplicate an already-generated combination.
   * Enabled by default.
   */
  avoidDuplicates?: boolean;
}

/** Hard cap on sets per generation request. */
export const MAX_SETS_PER_REQUEST = 100;

export type GenerateTicketsResult =
  | { ok: true; tickets: GeneratedTicket[] }
  | { ok: false; error: string };

/** The exact message shown when more unique combinations are requested than exist. */
export const TOO_MANY_COMBINATIONS_MESSAGE =
  "Please choose a smaller number of combinations.";
