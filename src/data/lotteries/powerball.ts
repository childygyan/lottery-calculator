/**
 * Powerball game configuration.
 *
 * Rules verified 2026-09-28 against the official Powerball site
 * (powerball.com/games/home): $2 per play, 5 white balls 1-69, 1 red
 * Powerball 1-26, drawings Mon/Wed/Sat 10:59 p.m. ET, annuity of 30
 * graduated payments over 29 years, Power Play +$1 (2X-10X, 10X only when
 * the advertised jackpot is $150M or less, Match 5 + Power Play always $2M),
 * Double Play +$1 as a separate drawing.
 *
 * Prize tier amounts and odds are the long-standing official prize table,
 * corroborated 2026-09-28 across multiple current sources (lotteryusa.com,
 * powerball.net, casinodaddy.com reporting the Sept 23, 2026 drawing).
 * The starting jackpot ($20M) is the advertised starting amount reported by
 * current lottery coverage; it is not stated on the official rules page, so
 * it is sourced separately in the registry.
 */
import type { LotteryConfig } from "./types.ts";

export const POWERBALL_CONFIG: LotteryConfig = {
  id: "powerball",
  name: "Powerball",
  slug: "powerball-calculator",

  version: "2026",
  effectiveDate: "2026-09-28",
  expirationDate: null,
  lastVerified: "2026-09-28",

  mainNumbers: 5,
  mainNumberRange: { min: 1, max: 69 },
  mainBallName: "white balls",
  bonusNumberName: "Powerball",
  bonusNumberRange: { min: 1, max: 26 },

  ticketPrice: 2,
  drawDays: "Monday, Wednesday, Saturday",
  drawTime: "10:59 p.m. ET",

  jackpotOdds: 292_201_338,
  anyPrizeOdds: 24.87,
  startingJackpot: 20_000_000,
  annuityDescription:
    "Jackpot winners may take the prize as an annuity paid in 30 graduated payments over 29 years, or as a one-time lump-sum cash payment.",

  prizeTiers: [
    { matchPattern: "5 + Powerball", basePrize: "jackpot", odds: 292_201_338 },
    { matchPattern: "5", basePrize: 1_000_000, odds: 11_688_053.52, multiplierApplicable: true },
    { matchPattern: "4 + Powerball", basePrize: 50_000, odds: 913_129.18, multiplierApplicable: true },
    { matchPattern: "4", basePrize: 100, odds: 36_525.17, multiplierApplicable: true },
    { matchPattern: "3 + Powerball", basePrize: 100, odds: 14_494.11, multiplierApplicable: true },
    { matchPattern: "3", basePrize: 7, odds: 579.76, multiplierApplicable: true },
    { matchPattern: "2 + Powerball", basePrize: 7, odds: 701.33, multiplierApplicable: true },
    { matchPattern: "1 + Powerball", basePrize: 4, odds: 91.98, multiplierApplicable: true },
    { matchPattern: "Powerball only", basePrize: 4, odds: 38.32, multiplierApplicable: true },
  ],

  multiplier: {
    name: "Power Play",
    costDescription: "An additional $1 per play (in Idaho and Montana, Powerball is bundled with Power Play for a minimum $3 per play).",
    multipliers: [2, 3, 4, 5, 10],
    appliesToJackpot: false,
    notes:
      "Power Play multiplies non-jackpot prizes by 2X, 3X, 4X, 5X, or 10X. The Match 5 prize with Power Play is always $2 million. The 10X multiplier is available only when the advertised jackpot is $150 million or less.",
  },

  annuity: {
    numberOfPayments: 30,
    paymentFrequency: "annual",
    // The official rules describe "30 graduated payments over 29 years" but
    // publish no fixed graduation rate, so no rate is invented here. The
    // calculator lets the user enter the annual increase themselves.
    growthRate: null,
    notes:
      "The official Powerball rules describe the annuity as 30 graduated payments over 29 years. Because no fixed graduation rate is published, the payout calculator asks you to enter the annual increase (use 0% for fixed equal payments).",
  },

  officialSource: {
    sourceId: "powerball-official-rules",
    sourceName: "Powerball — official game rules (powerball.com)",
  },
};
