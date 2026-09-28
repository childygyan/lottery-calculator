/**
 * Lottery game configuration + engine tests (no dist/ needed).
 *
 * Covers: config validation for both games, the generic validation rules,
 * odds formatting, config lookup, and the config-driven calculation engine
 * (both games must produce the same normalized result as the shared engine).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  POWERBALL_CONFIG,
  MEGA_MILLIONS_CONFIG,
  getLotteryConfig,
  getAllLotteryConfigs,
  validateLotteryConfig,
  formatOdds,
  type LotteryConfig,
} from "../src/data/lotteries/index.ts";
import { calculateLotteryGame } from "../src/lib/calculator/lottery-games.ts";
import { calculateLotteryWinnings } from "../src/lib/calculator/lottery.ts";

const BASE_INPUT = {
  advertisedJackpot: 100_000_000,
  cashValue: 48_000_000,
  payoutChoice: "lump_sum" as const,
  state: "CA",
  taxYear: 2026 as const,
  filingStatus: "single" as const,
};

describe("lottery game configurations", () => {
  it("exactly two games are registered", () => {
    const all = getAllLotteryConfigs();
    assert.equal(all.length, 2);
    assert.deepEqual(
      all.map((c) => c.id).sort(),
      ["mega-millions", "powerball"],
    );
  });

  it("Powerball config passes validation", () => {
    assert.deepEqual(validateLotteryConfig(POWERBALL_CONFIG), []);
  });

  it("Mega Millions config passes validation", () => {
    assert.deepEqual(validateLotteryConfig(MEGA_MILLIONS_CONFIG), []);
  });

  it("Powerball config matches verified official rules", () => {
    assert.equal(POWERBALL_CONFIG.ticketPrice, 2);
    assert.equal(POWERBALL_CONFIG.mainNumbers, 5);
    assert.deepEqual(POWERBALL_CONFIG.mainNumberRange, { min: 1, max: 69 });
    assert.deepEqual(POWERBALL_CONFIG.bonusNumberRange, { min: 1, max: 26 });
    assert.equal(POWERBALL_CONFIG.jackpotOdds, 292_201_338);
    assert.equal(POWERBALL_CONFIG.prizeTiers.length, 9);
    assert.equal(POWERBALL_CONFIG.prizeTiers[0]?.basePrize, "jackpot");
    assert.equal(POWERBALL_CONFIG.multiplier?.name, "Power Play");
    assert.equal(POWERBALL_CONFIG.expirationDate, null);
  });

  it("Mega Millions config matches verified official rules", () => {
    assert.equal(MEGA_MILLIONS_CONFIG.ticketPrice, 5);
    assert.deepEqual(MEGA_MILLIONS_CONFIG.mainNumberRange, { min: 1, max: 70 });
    assert.deepEqual(MEGA_MILLIONS_CONFIG.bonusNumberRange, { min: 1, max: 24 });
    assert.equal(MEGA_MILLIONS_CONFIG.jackpotOdds, 290_472_336);
    assert.equal(MEGA_MILLIONS_CONFIG.prizeTiers.length, 9);
    assert.equal(MEGA_MILLIONS_CONFIG.prizeTiers[0]?.basePrize, "jackpot");
    // Built-in multiplier is included in the ticket price.
    assert.match(MEGA_MILLIONS_CONFIG.multiplier?.costDescription ?? "", /Included/);
    assert.equal(MEGA_MILLIONS_CONFIG.expirationDate, null);
  });

  it("both configs carry rule versioning fields", () => {
    for (const config of getAllLotteryConfigs()) {
      assert.ok(config.version.trim(), `${config.id} version`);
      assert.ok(config.effectiveDate.trim(), `${config.id} effectiveDate`);
      assert.ok(config.lastVerified.trim(), `${config.id} lastVerified`);
      assert.ok(config.officialSource.sourceId.trim(), `${config.id} sourceId`);
    }
  });

  it("getLotteryConfig resolves known ids and undefined for unknown", () => {
    assert.equal(getLotteryConfig("powerball"), POWERBALL_CONFIG);
    assert.equal(getLotteryConfig("mega-millions"), MEGA_MILLIONS_CONFIG);
    assert.equal(getLotteryConfig("nope"), undefined);
  });
});

describe("validateLotteryConfig", () => {
  const valid: LotteryConfig = JSON.parse(JSON.stringify(POWERBALL_CONFIG));

  it("rejects an empty id", () => {
    assert.ok(validateLotteryConfig({ ...valid, id: "  " }).length > 0);
  });

  it("rejects an invalid number range", () => {
    const bad = { ...valid, mainNumberRange: { min: 0, max: 69 } };
    assert.ok(
      validateLotteryConfig(bad).some((p) => p.includes("mainNumberRange")),
    );
  });

  it("rejects a non-positive ticket price", () => {
    assert.ok(validateLotteryConfig({ ...valid, ticketPrice: 0 }).length > 0);
  });

  it("rejects an empty prize tier list", () => {
    assert.ok(validateLotteryConfig({ ...valid, prizeTiers: [] }).length > 0);
  });

  it("rejects a jackpot tier that is not first", () => {
    const tiers = [...valid.prizeTiers];
    tiers.push({ matchPattern: "x", basePrize: "jackpot", odds: 5 });
    assert.ok(validateLotteryConfig({ ...valid, prizeTiers: tiers }).length > 0);
  });

  it("rejects non-positive tier odds", () => {
    const tiers = valid.prizeTiers.map((t, i) =>
      i === 1 ? { ...t, odds: 0 } : t,
    );
    assert.ok(validateLotteryConfig({ ...valid, prizeTiers: tiers }).length > 0);
  });

  it("rejects an expirationDate before the effectiveDate", () => {
    const bad = { ...valid, effectiveDate: "2026-09-28", expirationDate: "2026-01-01" };
    assert.ok(validateLotteryConfig(bad).length > 0);
  });
});

describe("formatOdds", () => {
  it("formats integer odds with thousands separators", () => {
    assert.equal(formatOdds(292_201_338), "1 in 292,201,338");
  });

  it("keeps official decimal precision", () => {
    assert.equal(formatOdds(24.87), "1 in 24.87");
    assert.equal(formatOdds(11_688_053.52), "1 in 11,688,053.52");
  });
});

describe("calculateLotteryGame engine", () => {
  it("Powerball result equals the shared engine result", () => {
    const viaGame = calculateLotteryGame({ ...BASE_INPUT, lottery: "powerball" });
    const viaShared = calculateLotteryWinnings(BASE_INPUT);
    assert.deepEqual(viaGame, viaShared);
  });

  it("Mega Millions result equals the shared engine result", () => {
    const viaGame = calculateLotteryGame({ ...BASE_INPUT, lottery: "mega-millions" });
    const viaShared = calculateLotteryWinnings(BASE_INPUT);
    assert.deepEqual(viaGame, viaShared);
  });

  it("both games return the identical normalized result for the same inputs", () => {
    const pb = calculateLotteryGame({ ...BASE_INPUT, lottery: "powerball" });
    const mm = calculateLotteryGame({ ...BASE_INPUT, lottery: "mega-millions" });
    assert.deepEqual(pb, mm);
  });

  it("accepts a full config object, not just an id", () => {
    const result = calculateLotteryGame({ ...BASE_INPUT, lottery: MEGA_MILLIONS_CONFIG });
    assert.equal(result.state, "CA");
  });

  it("state integration: California shows $0 state tax through the game engine", () => {
    const result = calculateLotteryGame({ ...BASE_INPUT, lottery: "powerball" });
    assert.equal(result.stateTax, 0);
    assert.ok(result.federalTax > 0);
  });

  it("state integration: New York shows positive state tax through the game engine", () => {
    const result = calculateLotteryGame({ ...BASE_INPUT, lottery: "mega-millions", state: "NY" });
    assert.ok(result.stateTax > 0);
  });

  it("withholding is separated from final liability", () => {
    const result = calculateLotteryGame({ ...BASE_INPUT, lottery: "powerball" });
    assert.ok(result.federalWithholding > 0);
    assert.notEqual(result.federalWithholding, result.federalTax);
  });

  it("throws for an unknown lottery id", () => {
    assert.throws(
      () => calculateLotteryGame({ ...BASE_INPUT, lottery: "nope" }),
      /Unknown lottery/,
    );
  });

  it("throws for a config that fails validation instead of guessing", () => {
    const broken = { ...POWERBALL_CONFIG, ticketPrice: -1 };
    assert.throws(
      () => calculateLotteryGame({ ...BASE_INPUT, lottery: broken }),
      /failed validation/,
    );
  });

  it("annuity choice estimates one annual payment", () => {
    const result = calculateLotteryGame({
      ...BASE_INPUT,
      lottery: "powerball",
      payoutChoice: "annuity",
    });
    assert.ok(result.taxableAmount < BASE_INPUT.advertisedJackpot);
    assert.ok(result.taxableAmount > 0);
    assert.equal(result.payoutChoice, "annuity");
  });
});
