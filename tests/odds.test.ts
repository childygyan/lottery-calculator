/**
 * Phase 6 tests: lottery odds + probability engine.
 *
 * Covers: C(n,r) known values, Powerball/Mega Millions jackpot combinations
 * derived from centralized configs, single/multiple-ticket probability,
 * bounds, monotonicity, invalid/zero/negative/large inputs, expected
 * tickets/cost, ticket cost, custom lottery odds, and display formatting.
 * Randomness is NOT tested statistically — only range/structure/validity
 * (there is no RNG in this engine). No dist/ needed.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateCombinations,
  calculateJackpotCombinations,
  calculateOdds,
  calculateProbability,
  calculateAtLeastOneWin,
  calculateExpectedTickets,
  calculateExpectedCost,
  calculateTicketCost,
  calculateCustomLotteryOdds,
  validateLotteryOddsConfig,
  lotteryOddsConfigFromGame,
  formatOneInX,
  formatTinyPercent,
  formatWholeNumber,
  MAX_NUMBER_POOL,
  MAX_TICKET_COUNT,
} from "../src/lib/calculator/index.ts";
import {
  POWERBALL_CONFIG,
  MEGA_MILLIONS_CONFIG,
} from "../src/data/lotteries/index.ts";

function okValue<T extends { ok: boolean }>(r: T): number {
  assert.equal(r.ok, true, `expected ok, got error: ${(r as { error?: string }).error}`);
  return (r as unknown as { value: number }).value;
}

describe("calculateCombinations", () => {
  it("C(5,2) = 10", () => {
    assert.equal(okValue(calculateCombinations(5, 2)), 10);
  });
  it("C(10,5) = 252", () => {
    assert.equal(okValue(calculateCombinations(10, 5)), 252);
  });
  it("C(69,5) = 11,238,513", () => {
    assert.equal(okValue(calculateCombinations(69, 5)), 11_238_513);
  });
  it("C(70,5) = 12,103,014", () => {
    assert.equal(okValue(calculateCombinations(70, 5)), 12_103_014);
  });
  it("C(49,6) = 13,983,816 (classic 6/49 lottery)", () => {
    assert.equal(okValue(calculateCombinations(49, 6)), 13_983_816);
  });
  it("C(n,0) = 1 and C(n,n) = 1", () => {
    assert.equal(okValue(calculateCombinations(69, 0)), 1);
    assert.equal(okValue(calculateCombinations(69, 69)), 1);
    assert.equal(okValue(calculateCombinations(0, 0)), 1);
  });
  it("rejects negative inputs", () => {
    assert.equal(calculateCombinations(-3, 2).ok, false);
    assert.equal(calculateCombinations(5, -1).ok, false);
  });
  it("rejects r > n", () => {
    const r = calculateCombinations(69, 70);
    assert.equal(r.ok, false);
    assert.match((r as { error: string }).error, /more numbers than the pool/i);
  });
  it("rejects non-integer inputs", () => {
    assert.equal(calculateCombinations(5.5, 2).ok, false);
    assert.equal(calculateCombinations(10, 2.5).ok, false);
  });
  it("rejects zero pool with picks", () => {
    assert.equal(calculateCombinations(0, 1).ok, false);
  });
  it("returns a controlled error for overflow-prone inputs, not a wrong number", () => {
    const r = calculateCombinations(1000, 500);
    assert.equal(r.ok, false);
    assert.match((r as { error: string }).error, /too large/i);
  });
  it("rejects pools above the supported maximum", () => {
    assert.equal(calculateCombinations(MAX_NUMBER_POOL + 1, 2).ok, false);
  });
});

describe("jackpot combinations from centralized configs", () => {
  it("derives Powerball jackpot combinations = 292,201,338", () => {
    const cfg = lotteryOddsConfigFromGame(POWERBALL_CONFIG);
    assert.deepEqual(
      { mainNumbersToPick: cfg.mainNumbersToPick, mainNumberPool: cfg.mainNumberPool, bonusNumbersToPick: cfg.bonusNumbersToPick, bonusNumberPool: cfg.bonusNumberPool },
      { mainNumbersToPick: 5, mainNumberPool: 69, bonusNumbersToPick: 1, bonusNumberPool: 26 },
    );
    const combos = calculateJackpotCombinations(cfg);
    assert.equal(okValue(combos), 292_201_338);
  });
  it("derived Powerball combinations match the verified config jackpotOdds", () => {
    const cfg = lotteryOddsConfigFromGame(POWERBALL_CONFIG);
    const combos = calculateJackpotCombinations(cfg);
    assert.ok(combos.ok);
    assert.equal(combos.value, POWERBALL_CONFIG.jackpotOdds);
  });
  it("derives Mega Millions jackpot combinations = 290,472,336", () => {
    const cfg = lotteryOddsConfigFromGame(MEGA_MILLIONS_CONFIG);
    const combos = calculateJackpotCombinations(cfg);
    assert.equal(okValue(combos), 290_472_336);
  });
  it("derived Mega Millions combinations match the verified config jackpotOdds", () => {
    const cfg = lotteryOddsConfigFromGame(MEGA_MILLIONS_CONFIG);
    const combos = calculateJackpotCombinations(cfg);
    assert.ok(combos.ok);
    assert.equal(combos.value, MEGA_MILLIONS_CONFIG.jackpotOdds);
  });
  it("carries the verified ticket price through (PB $2, MM $5)", () => {
    assert.equal(lotteryOddsConfigFromGame(POWERBALL_CONFIG).ticketPrice, 2);
    assert.equal(lotteryOddsConfigFromGame(MEGA_MILLIONS_CONFIG).ticketPrice, 5);
  });
  it("rejects an invalid config instead of computing", () => {
    const bad = { mainNumbersToPick: 5, mainNumberPool: 4, bonusNumbersToPick: 0, bonusNumberPool: 0 };
    assert.equal(calculateJackpotCombinations(bad).ok, false);
  });
});

describe("calculateOdds and calculateProbability", () => {
  it("odds are positive and equal the combination count", () => {
    const r = calculateOdds(292_201_338);
    assert.ok(r.ok && r.oneInX === 292_201_338 && r.oneInX > 0);
  });
  it("rejects zero/negative/non-integer combinations", () => {
    assert.equal(calculateOdds(0).ok, false);
    assert.equal(calculateOdds(-5).ok, false);
    assert.equal(calculateOdds(2.5).ok, false);
  });
  it("single-ticket probability = 1 / combinations, within [0, 1]", () => {
    const r = calculateProbability(292_201_338);
    assert.ok(r.ok);
    if (r.ok) {
      assert.ok(r.probability > 0 && r.probability <= 1);
      assert.ok(Math.abs(r.probability - 1 / 292_201_338) < 1e-20);
    }
  });
  it("probability of a certain event is 1", () => {
    const r = calculateProbability(1);
    assert.ok(r.ok && r.probability === 1);
  });
  it("rejects invalid combination counts", () => {
    assert.equal(calculateProbability(0).ok, false);
    assert.equal(calculateProbability(-1).ok, false);
  });
});

describe("calculateAtLeastOneWin", () => {
  const p = 1 / 292_201_338;
  function atLeast(n: number): number {
    const r = calculateAtLeastOneWin(p, n);
    assert.ok(r.ok, `n=${n}: ${(r as { error?: string }).error}`);
    return (r as { ok: true; probability: number }).probability;
  }

  it("one ticket ≈ p", () => {
    // 1 - (1 - p) loses a few ulps near 1, so compare relatively.
    assert.ok(Math.abs(atLeast(1) - p) / p < 1e-6);
  });
  it("is approximately linear in n for small n*p", () => {
    // Second-order term is (np)^2/2, so allow 0.001% slack.
    for (const n of [10, 100, 1000]) {
      assert.ok(Math.abs(atLeast(n) - n * p) / (n * p) < 1e-5, `n=${n}`);
    }
  });
  it("is approximately linear in n for small n*p", () => {
    // Second-order term is (np)^2/2, so allow 0.001% slack.
    for (const n of [10, 100, 1000]) {
      assert.ok(Math.abs(atLeast(n) - n * p) / (n * p) < 1e-5, `n=${n}`);
    }
  });
  it("handles larger counts (1e6) without exceeding 1", () => {
    const v = atLeast(1_000_000);
    assert.ok(v > 0 && v < 1);
    assert.ok(Math.abs(v - (1 - Math.exp(-p * 1_000_000))) < 1e-9);
  });
  it("is monotonic increasing in ticket count", () => {
    const counts = [1, 2, 10, 100, 1000, 10000, 100000];
    const probs = counts.map(atLeast);
    for (let i = 1; i < probs.length; i++) {
      assert.ok((probs[i] ?? 0) > (probs[i - 1] ?? 0), `not monotonic at ${counts[i]}`);
    }
  });
  it("probability never exceeds 100%", () => {
    for (const n of [1, 100, 1_000_000, MAX_TICKET_COUNT]) {
      const v = atLeast(n);
      assert.ok(v >= 0 && v <= 1, `out of bounds at n=${n}: ${v}`);
    }
  });
  it("probability 1 stays 1 for any ticket count", () => {
    const r = calculateAtLeastOneWin(1, 5);
    assert.ok(r.ok && r.probability === 1);
  });
  it("rejects invalid probabilities", () => {
    assert.equal(calculateAtLeastOneWin(0, 10).ok, false);
    assert.equal(calculateAtLeastOneWin(-0.5, 10).ok, false);
    assert.equal(calculateAtLeastOneWin(1.5, 10).ok, false);
    assert.equal(calculateAtLeastOneWin(NaN, 10).ok, false);
  });
  it("rejects invalid ticket counts", () => {
    assert.equal(calculateAtLeastOneWin(p, 0).ok, false);
    assert.equal(calculateAtLeastOneWin(p, -3).ok, false);
    assert.equal(calculateAtLeastOneWin(p, 2.5).ok, false);
    assert.equal(calculateAtLeastOneWin(p, MAX_TICKET_COUNT + 1).ok, false);
  });
});

describe("expected tickets, expected cost, ticket cost", () => {
  const p = 1 / 292_201_338;
  it("expected tickets = 1/p", () => {
    const r = calculateExpectedTickets(p);
    assert.ok(r.ok && r.tickets === 292_201_338);
  });
  it("expected cost = (1/p) * price", () => {
    const r = calculateExpectedCost(p, 2);
    assert.ok(r.ok && r.cost === 584_402_676);
  });
  it("ticket cost = count * price", () => {
    const r = calculateTicketCost(10, 2);
    assert.ok(r.ok && r.cost === 20);
  });
  it("rejects negative prices", () => {
    assert.equal(calculateExpectedCost(p, -2).ok, false);
    assert.equal(calculateTicketCost(10, -2).ok, false);
  });
  it("rejects zero probability for expectations", () => {
    assert.equal(calculateExpectedTickets(0).ok, false);
    assert.equal(calculateExpectedCost(0, 2).ok, false);
  });
});

describe("calculateCustomLotteryOdds", () => {
  it("works end-to-end for a 6/49 lottery with no bonus ball", () => {
    const r = calculateCustomLotteryOdds({
      config: { mainNumbersToPick: 6, mainNumberPool: 49, bonusNumbersToPick: 0, bonusNumberPool: 0 },
      ticketCount: 1,
    });
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.combinations, 13_983_816);
      assert.equal(r.oneInX, 13_983_816);
      assert.ok(Math.abs(r.probability - 1 / 13_983_816) < 1e-18);
      assert.equal(r.ticketCost, null);
      assert.equal(r.expectedCost, null);
      assert.equal(r.expectedTickets, 13_983_816);
    }
  });
  it("includes cost figures when a verified price is present", () => {
    const r = calculateCustomLotteryOdds({
      config: lotteryOddsConfigFromGame(POWERBALL_CONFIG),
      ticketCount: 10,
    });
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.ticketCost, 20);
      assert.equal(r.expectedCost, 584_402_676);
      assert.ok(r.atLeastOneWin > r.probability);
    }
  });
  it("defaults to 1 ticket", () => {
    const r = calculateCustomLotteryOdds({ config: lotteryOddsConfigFromGame(MEGA_MILLIONS_CONFIG) });
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.ticketCount, 1);
      assert.ok(Math.abs(r.atLeastOneWin - r.probability) / r.probability < 1e-6);
    }
  });
  it("propagates config validation errors", () => {
    const r = calculateCustomLotteryOdds({
      config: { mainNumbersToPick: 0, mainNumberPool: 69, bonusNumbersToPick: 0, bonusNumberPool: 0 },
    });
    assert.equal(r.ok, false);
  });
});

describe("validateLotteryOddsConfig", () => {
  it("accepts a valid custom config", () => {
    assert.equal(
      validateLotteryOddsConfig({ mainNumbersToPick: 6, mainNumberPool: 49, bonusNumbersToPick: 0, bonusNumberPool: 0 }).valid,
      true,
    );
  });
  it("rejects picks > pool, negative pools, mismatched bonus fields", () => {
    assert.equal(validateLotteryOddsConfig({ mainNumbersToPick: 7, mainNumberPool: 6, bonusNumbersToPick: 0, bonusNumberPool: 0 }).valid, false);
    assert.equal(validateLotteryOddsConfig({ mainNumbersToPick: 5, mainNumberPool: -69, bonusNumbersToPick: 0, bonusNumberPool: 0 }).valid, false);
    assert.equal(validateLotteryOddsConfig({ mainNumbersToPick: 5, mainNumberPool: 69, bonusNumbersToPick: 0, bonusNumberPool: 26 }).valid, false);
    assert.equal(validateLotteryOddsConfig({ mainNumbersToPick: 5, mainNumberPool: 69, bonusNumbersToPick: 2, bonusNumberPool: 1 }).valid, false);
  });
});

describe("display formatting", () => {
  it('formatOneInX renders "1 in 292,201,338"', () => {
    assert.equal(formatOneInX(292_201_338), "1 in 292,201,338");
  });
  it("formatTinyPercent keeps tiny probabilities nonzero", () => {
    assert.equal(formatTinyPercent(1 / 292_201_338), "0.000000342%");
    assert.equal(formatTinyPercent(1 / 13_983_816), "0.00000715%");
  });
  it("formatTinyPercent handles 0 and 1", () => {
    assert.equal(formatTinyPercent(0), "0%");
    assert.equal(formatTinyPercent(1), "100%");
  });
  it("formatWholeNumber adds thousands separators", () => {
    assert.equal(formatWholeNumber(292_201_338), "292,201,338");
  });
});
