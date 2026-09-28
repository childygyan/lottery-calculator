/**
 * Mega Millions game configuration.
 *
 * Rules verified 2026-09-28 against the official Mega Millions site
 * (megamillions.com/how-to-play): $5.00 per play with the multiplier
 * included, 5 white balls 1-70, 1 gold Mega Ball 1-24, drawings Tuesday and
 * Friday at 11:00 p.m. ET, nine ways to win, multiplier of 2X-10X randomly
 * assigned at purchase applying to all non-jackpot prizes, annuity of one
 * immediate payment followed by 29 annual payments each 5% larger than the
 * previous, cash option equal to all cash in the jackpot prize pool.
 * California pays non-jackpot prizes on a pari-mutuel basis.
 */
import type { LotteryConfig } from "./types.ts";

export const MEGA_MILLIONS_CONFIG: LotteryConfig = {
  id: "mega-millions",
  name: "Mega Millions",
  slug: "mega-millions-calculator",

  version: "2026",
  effectiveDate: "2026-09-28",
  expirationDate: null,
  lastVerified: "2026-09-28",

  mainNumbers: 5,
  mainNumberRange: { min: 1, max: 70 },
  mainBallName: "white balls",
  bonusNumberName: "Mega Ball",
  bonusNumberRange: { min: 1, max: 24 },

  ticketPrice: 5,
  drawDays: "Tuesday, Friday",
  drawTime: "11:00 p.m. ET",

  jackpotOdds: 290_472_336,
  anyPrizeOdds: 23,
  startingJackpot: 50_000_000,
  annuityDescription:
    "The Mega Millions annuity is paid as one immediate payment followed by 29 annual payments, each 5% bigger than the previous one.",

  annuity: {
    numberOfPayments: 30,
    paymentFrequency: "annual",
    growthRate: 0.05,
    firstPaymentDescription: "One immediate payment",
    notes:
      "One immediate payment followed by 29 annual payments, each 5% larger than the previous one. The nominal total of all 30 payments equals the advertised jackpot.",
  },

  prizeTiers: [
    {
      matchPattern: "5 + Mega Ball",
      basePrize: "jackpot",
      odds: 290_472_336,
    },
    {
      matchPattern: "5",
      basePrize: 2_000_000,
      odds: 12_629_232,
      multiplierApplicable: true,
      prizeByMultiplier: { "2": 2_000_000, "3": 3_000_000, "4": 4_000_000, "5": 5_000_000, "10": 10_000_000 },
    },
    {
      matchPattern: "4 + Mega Ball",
      basePrize: 20_000,
      odds: 893_761,
      multiplierApplicable: true,
      prizeByMultiplier: { "2": 20_000, "3": 30_000, "4": 40_000, "5": 50_000, "10": 100_000 },
    },
    {
      matchPattern: "4",
      basePrize: 1_000,
      odds: 38_859,
      multiplierApplicable: true,
      prizeByMultiplier: { "2": 1_000, "3": 1_500, "4": 2_000, "5": 2_500, "10": 5_000 },
    },
    {
      matchPattern: "3 + Mega Ball",
      basePrize: 400,
      odds: 13_965,
      multiplierApplicable: true,
      prizeByMultiplier: { "2": 400, "3": 600, "4": 800, "5": 1_000, "10": 2_000 },
    },
    {
      matchPattern: "3",
      basePrize: 20,
      odds: 607,
      multiplierApplicable: true,
      prizeByMultiplier: { "2": 20, "3": 30, "4": 40, "5": 50, "10": 100 },
    },
    {
      matchPattern: "2 + Mega Ball",
      basePrize: 20,
      odds: 665,
      multiplierApplicable: true,
      prizeByMultiplier: { "2": 20, "3": 30, "4": 40, "5": 50, "10": 100 },
    },
    {
      matchPattern: "1 + Mega Ball",
      basePrize: 14,
      odds: 86,
      multiplierApplicable: true,
      prizeByMultiplier: { "2": 14, "3": 21, "4": 28, "5": 35, "10": 70 },
    },
    {
      matchPattern: "Mega Ball only",
      basePrize: 10,
      odds: 35,
      multiplierApplicable: true,
      prizeByMultiplier: { "2": 10, "3": 15, "4": 20, "5": 25, "10": 50 },
    },
  ],

  multiplier: {
    name: "Multiplier",
    costDescription: "Included in the $5.00 ticket price — no extra cost.",
    multipliers: [2, 3, 4, 5, 10],
    appliesToJackpot: false,
    notes:
      "One of five multipliers (2X, 3X, 4X, 5X, 10X) is randomly assigned at purchase and applies to all non-jackpot prizes. Multiplier odds: 2X at 1 in 2.13, 3X at 1 in 3.2, 4X at 1 in 8, 5X at 1 in 16, 10X at 1 in 32.",
  },

  officialSource: {
    sourceId: "megamillions-official-rules",
    sourceName: "Mega Millions — official how to play (megamillions.com)",
  },
};
