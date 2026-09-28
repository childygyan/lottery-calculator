/**
 * Lottery game configurations barrel.
 *
 * Central access point for every supported lottery game. Pages and the
 * engine look configs up by id; nothing outside src/data/lotteries/
 * hard-codes game rules.
 */
import type { LotteryConfig } from "./types.ts";
import { POWERBALL_CONFIG } from "./powerball.ts";
import { MEGA_MILLIONS_CONFIG } from "./mega-millions.ts";

export type { LotteryConfig, PrizeTier, MultiplierRule, AnnuityConfig, AnnuityFrequency, NumberRange, LotterySourceRef } from "./types.ts";
export { validateLotteryConfig, formatOdds } from "./types.ts";
export { POWERBALL_CONFIG } from "./powerball.ts";
export { MEGA_MILLIONS_CONFIG } from "./mega-millions.ts";

const LOTTERY_CONFIGS: Record<string, LotteryConfig> = {
  [POWERBALL_CONFIG.id]: POWERBALL_CONFIG,
  [MEGA_MILLIONS_CONFIG.id]: MEGA_MILLIONS_CONFIG,
};

export function getLotteryConfig(id: string): LotteryConfig | undefined {
  return LOTTERY_CONFIGS[id];
}

export function getAllLotteryConfigs(): LotteryConfig[] {
  return [POWERBALL_CONFIG, MEGA_MILLIONS_CONFIG];
}
