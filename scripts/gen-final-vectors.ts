/**
 * One-off vector generator for tests/fixtures/final-calculation-vectors.json.
 * Runs the REAL engines and prints the JSON. Redirect stdout to the fixture:
 *   node scripts/gen-final-vectors.ts > tests/fixtures/final-calculation-vectors.json
 */
import { calculateLotteryWinnings } from "../src/lib/calculator/lottery.ts";
import { calculatePayoutComparison } from "../src/lib/calculator/payout.ts";
import { calculateWithholding } from "../src/lib/calculator/withholding.ts";
import {
  calculateAtLeastOneWin,
  calculateCombinations,
  calculateJackpotCombinations,
  lotteryOddsConfigFromGame,
} from "../src/lib/calculator/odds.ts";
import {
  generateTickets,
  generatorConfigFromLotteryConfig,
  sequenceRandomSource,
} from "../src/lib/generator/index.ts";
import {
  MEGA_MILLIONS_CONFIG,
  POWERBALL_CONFIG,
} from "../src/data/lotteries/index.ts";

/** Deterministic PRNG (mulberry32) so the generator vector is reproducible. */
function mulberry32(seed: number): number[] {
  const out: number[] = [];
  let a = seed >>> 0;
  for (let i = 0; i < 4096; i++) {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    out.push(((t ^ (t >>> 14)) >>> 0) % 1_000_000);
  }
  return out;
}

const vectors: Array<Record<string, unknown>> = [];
const pick = <T>(obj: T, keys: Array<keyof T>): Partial<T> => {
  const r: Partial<T> = {};
  for (const k of keys) r[k] = obj[k];
  return r;
};

// ---- 1. Tax engine: 3 full scenarios via calculateLotteryWinnings ----
const taxScenarios = [
  { advertisedJackpot: 100_000_000, cashValue: 100_000_000, payoutChoice: "lump_sum" as const, state: "CA", taxYear: 2026 as const, filingStatus: "single" as const },
  { advertisedJackpot: 10_000_000, cashValue: 10_000_000, payoutChoice: "lump_sum" as const, state: "TX", taxYear: 2026 as const, filingStatus: "married_jointly" as const },
  // $1M annuity payment: advertised $30M / 30 years = $1M annual payment, taxed as that year's income
  { advertisedJackpot: 30_000_000, cashValue: 15_000_000, payoutChoice: "annuity" as const, state: "NY", taxYear: 2026 as const, filingStatus: "head_of_household" as const },
];
for (const input of taxScenarios) {
  const out = calculateLotteryWinnings(input);
  vectors.push({
    engine: "tax",
    inputs: input,
    expected: pick(out, [
      "taxableAmount", "federalTax", "stateTax", "totalEstimatedTax",
      "estimatedTakeHome", "federalWithholding", "stateWithholding",
      "totalWithholding", "estimatedEffectiveTaxRate", "stateDataStatus",
    ]),
  });
}

// ---- 1b. Documented fallback: tax year 2025 has NO data in src/data/taxes/*;
// the engine silently substitutes DEFAULT_TAX_YEAR (2026). This vector locks
// that behavior so adding real 2025 data (or an error) breaks it loudly.
{
  const input = {
    advertisedJackpot: 5_000_000, cashValue: 5_000_000,
    payoutChoice: "lump_sum" as const, state: "NY", taxYear: 2025 as const,
    filingStatus: "single" as const,
  };
  const out = calculateLotteryWinnings(input);
  vectors.push({
    engine: "tax-fallback",
    inputs: input,
    note: "tax year 2025 is unsupported (only 2026 data ships); engine falls back to 2026 rules",
    expected: {
      taxYearUsed: out.taxYear,
      federalTax: out.federalTax,
      stateTax: out.stateTax,
      equalsExplicit2026: out.federalTax === calculateLotteryWinnings({ ...input, taxYear: 2026 }).federalTax,
    },
  });
}

// ---- 2. Payout engine: Powerball $500M, cash $250M, 0% and 5% growth ----
for (const annualIncrease of [0, 0.05]) {
  const out = calculatePayoutComparison({
    advertisedJackpot: 500_000_000, cashValue: 250_000_000,
    annuityYears: 30, annualIncrease, state: "CA",
    taxYear: 2026, filingStatus: "single",
  });
  vectors.push({
    engine: "payout",
    inputs: { advertisedJackpot: 500_000_000, cashValue: 250_000_000, annuityYears: 30, annualIncrease, state: "CA", taxYear: 2026, filingStatus: "single" },
    expected: {
      cash: pick(out.cash, ["gross", "federalTax", "stateTax", "totalTax", "net", "federalWithholding", "stateWithholding", "totalWithholding"]),
      annuityFirstPayment: out.annuity.firstPayment,
      annuityLastPayment: out.annuity.lastPayment,
      annuityGross: out.annuity.gross,
      annuityTotalTax: out.annuity.totalTax,
      annuityNet: out.annuity.net,
      assumptions: out.assumptions,
    },
  });
}

// ---- 3. Odds engine: jackpot odds from game configs; 10-ticket probability ----
const pbCfg = lotteryOddsConfigFromGame(POWERBALL_CONFIG);
const mmCfg = lotteryOddsConfigFromGame(MEGA_MILLIONS_CONFIG);
const pbCombos = calculateJackpotCombinations(pbCfg);
const mmCombos = calculateJackpotCombinations(mmCfg);
if (!pbCombos.ok || !mmCombos.ok) throw new Error("odds engine failed");
const pbTen = calculateAtLeastOneWin(1 / pbCombos.value, 10);
if (!pbTen.ok) throw new Error("at-least-one-win failed");
vectors.push({
  engine: "odds",
  inputs: { game: "powerball", note: "jackpot combinations from verified game config" },
  expected: {
    oneInX: pbCombos.value,
    configJackpotOdds: POWERBALL_CONFIG.jackpotOdds,
    equal: pbCombos.value === POWERBALL_CONFIG.jackpotOdds,
    tenTicketProbability: pbTen.probability,
  },
});
vectors.push({
  engine: "odds",
  inputs: { game: "mega_millions", note: "jackpot combinations from verified game config" },
  expected: {
    oneInX: mmCombos.value,
    configJackpotOdds: MEGA_MILLIONS_CONFIG.jackpotOdds,
    equal: mmCombos.value === MEGA_MILLIONS_CONFIG.jackpotOdds,
  },
});

// ---- 4. Combinations: 69 choose 5 ----
const c695 = calculateCombinations(69, 5);
if (!c695.ok) throw new Error("combinations failed");
vectors.push({
  engine: "combinations",
  inputs: { n: 69, r: 5 },
  expected: { value: c695.value },
});

// ---- 5. Generator: 100 sets with deterministic RNG, property checks ----
const GEN_SEED = 12345;
const genConfig = generatorConfigFromLotteryConfig(POWERBALL_CONFIG);
const genResult = generateTickets(genConfig, 100, { avoidDuplicates: false }, sequenceRandomSource(mulberry32(GEN_SEED)));
if (!genResult.ok) throw new Error("generator failed");
const tickets = genResult.tickets;
const props = {
  allMainsInRange: tickets.every((t) => t.mainNumbers.every((n) => n >= 1 && n <= 69)),
  allMainsSorted: tickets.every((t) => t.mainNumbers.every((n, i, a) => i === 0 || n > (a[i - 1] as number))),
  allMainsUniqueWithinTicket: tickets.every((t) => new Set(t.mainNumbers).size === 5),
  allBonusesInRange: tickets.every((t) => t.bonusNumbers.every((n) => n >= 1 && n <= 26)),
  allMainsCount5: tickets.every((t) => t.mainNumbers.length === 5),
  allBonusesCount1: tickets.every((t) => t.bonusNumbers.length === 1),
  firstTicket: tickets[0],
};
vectors.push({
  engine: "generator",
  inputs: { game: "powerball", sets: 100, rng: "mulberry32", rngSeed: GEN_SEED, avoidDuplicates: false },
  expected: props,
});

// ---- 6. Withholding: 24% of $1M reported separately from liability ----
const wh = calculateWithholding(1_000_000, 2026, "single", "CA");
const liab = calculateLotteryWinnings({
  advertisedJackpot: 1_000_000, cashValue: 1_000_000,
  payoutChoice: "lump_sum", state: "CA", taxYear: 2026, filingStatus: "single",
});
vectors.push({
  engine: "withholding",
  inputs: { payoutAmount: 1_000_000, taxYear: 2026, filingStatus: "single", state: "CA" },
  expected: {
    federalWithholding: wh.federalWithholding,
    stateWithholding: wh.stateWithholding,
    totalWithholding: wh.totalWithholding,
    twentyFourPercentOfPrize: 0.24 * 1_000_000,
    liabilityFederalTax: liab.federalTax,
    liabilityTotalTax: liab.totalEstimatedTax,
    withholdingSeparateFromLiability: wh.federalWithholding !== liab.federalTax,
  },
});

console.log(JSON.stringify({ generatedAt: "2026-10-12", vectors }, null, 2));
