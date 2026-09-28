/**
 * Lottery-game calculation engine.
 *
 * This is the single entry point for game-specific calculations. It accepts
 * a LotteryConfig and delegates all tax math to the shared
 * calculateLotteryWinnings() engine — there are no per-game tax functions
 * (no calculatePowerballTax / calculateMegaMillionsTax). Taxes depend on
 * the payout amount, state, tax year, and filing status — never on which
 * lottery produced the winnings — so one engine serves every game.
 */
import {
  calculateLotteryWinnings,
  type LotteryCalculatorInput,
} from "./lottery.ts";
import type { LotteryCalculationResult } from "./types.ts";
import {
  getLotteryConfig,
  validateLotteryConfig,
  type LotteryConfig,
} from "../../data/lotteries/index.ts";

export interface LotteryGameCalculationInput extends LotteryCalculatorInput {
  /**
   * Lottery game id ("powerball" | "mega-millions"), or a full config for
   * callers that already resolved one.
   */
  lottery: string | LotteryConfig;
}

/**
 * Calculate estimated taxes and take-home for a lottery game's jackpot.
 * Returns the same normalized LotteryCalculationResult the generic
 * calculator produces; the game config only drives validation and context.
 *
 * Throws when the lottery id is unknown or its config fails validation —
 * the engine never calculates with unverified game rules.
 */
export function calculateLotteryGame(
  input: LotteryGameCalculationInput,
): LotteryCalculationResult {
  const config =
    typeof input.lottery === "string" ? getLotteryConfig(input.lottery) : input.lottery;

  if (!config) {
    throw new Error(`Unknown lottery: ${String(input.lottery)}`);
  }
  const problems = validateLotteryConfig(config);
  if (problems.length > 0) {
    throw new Error(
      `Lottery configuration for "${config.id}" failed validation: ${problems.join(" ")}`,
    );
  }

  const { lottery: _lottery, ...engineInput } = input;
  return calculateLotteryWinnings(engineInput);
}
