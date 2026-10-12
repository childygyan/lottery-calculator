/**
 * Final calculation vectors regression gate (Phase 10).
 *
 * Loads tests/fixtures/final-calculation-vectors.json — whose `expected`
 * values were produced by RUNNING the real engines (see
 * scripts/gen-final-vectors.ts) — and re-runs each engine, asserting the
 * outputs match the fixture exactly. If any engine's math or data changes,
 * this test fails.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { calculateLotteryWinnings } from "../src/lib/calculator/lottery.ts";
import {
  calculatePayoutComparison,
  type ParsedPayoutInput,
} from "../src/lib/calculator/payout.ts";
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
import type { FilingStatus, TaxYear } from "../src/lib/calculator/types.ts";

const require = createRequire(import.meta.url);
const fixture = require("./fixtures/final-calculation-vectors.json") as {
  generatedAt: string;
  vectors: Array<{ engine: string; inputs: any; expected: any }>;
};

function byEngine(engine: string) {
  return fixture.vectors.filter((v) => v.engine === engine);
}

/** Same deterministic PRNG as scripts/gen-final-vectors.ts (seed in fixture). */
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

describe("final calculation vectors", () => {
  it("fixture has the expected shape and 10 vectors", () => {
    assert.equal(fixture.generatedAt, "2026-10-12");
    assert.equal(fixture.vectors.length, 11);
  });

  describe("tax engine", () => {
    for (const [i, v] of byEngine("tax").entries()) {
      it(`vector ${i}: ${v.inputs.filingStatus} ${v.inputs.state} ${v.inputs.taxYear} matches exactly`, () => {
        const out = calculateLotteryWinnings({
          advertisedJackpot: v.inputs.advertisedJackpot,
          cashValue: v.inputs.cashValue,
          payoutChoice: v.inputs.payoutChoice,
          state: v.inputs.state,
          taxYear: v.inputs.taxYear as TaxYear,
          filingStatus: v.inputs.filingStatus as FilingStatus,
        });
        assert.deepEqual(
          {
            taxableAmount: out.taxableAmount,
            federalTax: out.federalTax,
            stateTax: out.stateTax,
            totalEstimatedTax: out.totalEstimatedTax,
            estimatedTakeHome: out.estimatedTakeHome,
            federalWithholding: out.federalWithholding,
            stateWithholding: out.stateWithholding,
            totalWithholding: out.totalWithholding,
            estimatedEffectiveTaxRate: out.estimatedEffectiveTaxRate,
            stateDataStatus: out.stateDataStatus,
          },
          v.expected,
        );
      });
    }
  });

  describe("tax-fallback", () => {
    it("unsupported tax year 2025 falls back to DEFAULT_TAX_YEAR (2026) — locked behavior", () => {
      const v = byEngine("tax-fallback")[0];
      assert.ok(v, "tax-fallback vector missing");
      const out = calculateLotteryWinnings({
        advertisedJackpot: v.inputs.advertisedJackpot,
        cashValue: v.inputs.cashValue,
        payoutChoice: v.inputs.payoutChoice,
        state: v.inputs.state,
        taxYear: v.inputs.taxYear as TaxYear,
        filingStatus: v.inputs.filingStatus as FilingStatus,
      });
      assert.equal(out.taxYear, 2026);
      assert.equal(out.taxYear, v.expected.taxYearUsed);
      assert.equal(out.federalTax, v.expected.federalTax);
      assert.equal(out.stateTax, v.expected.stateTax);
      const explicit = calculateLotteryWinnings({
        advertisedJackpot: v.inputs.advertisedJackpot,
        cashValue: v.inputs.cashValue,
        payoutChoice: v.inputs.payoutChoice,
        state: v.inputs.state,
        taxYear: 2026,
        filingStatus: v.inputs.filingStatus as FilingStatus,
      });
      assert.equal(out.federalTax === explicit.federalTax, v.expected.equalsExplicit2026);
      assert.equal(v.expected.equalsExplicit2026, true);
    });
  });

  describe("payout engine", () => {
    for (const [i, v] of byEngine("payout").entries()) {
      it(`vector ${i}: growth ${(v.inputs.annualIncrease * 100).toFixed(0)}% matches exactly`, () => {
        const input: ParsedPayoutInput = {
          advertisedJackpot: v.inputs.advertisedJackpot,
          cashValue: v.inputs.cashValue,
          annuityYears: v.inputs.annuityYears,
          annualIncrease: v.inputs.annualIncrease,
          state: v.inputs.state,
          taxYear: v.inputs.taxYear as TaxYear,
          filingStatus: v.inputs.filingStatus as FilingStatus,
        };
        const out = calculatePayoutComparison(input);
        assert.deepEqual(
          {
            gross: out.cash.gross,
            federalTax: out.cash.federalTax,
            stateTax: out.cash.stateTax,
            totalTax: out.cash.totalTax,
            net: out.cash.net,
            federalWithholding: out.cash.federalWithholding,
            stateWithholding: out.cash.stateWithholding,
            totalWithholding: out.cash.totalWithholding,
          },
          v.expected.cash,
        );
        assert.equal(out.annuity.firstPayment, v.expected.annuityFirstPayment);
        assert.equal(out.annuity.lastPayment, v.expected.annuityLastPayment);
        assert.equal(out.annuity.gross, v.expected.annuityGross);
        assert.equal(out.annuity.totalTax, v.expected.annuityTotalTax);
        assert.equal(out.annuity.net, v.expected.annuityNet);
        assert.deepEqual(out.assumptions, v.expected.assumptions);
      });
    }
  });

  describe("odds engine", () => {
    it("Powerball jackpot odds equal the config value 292,201,338", () => {
      const v = byEngine("odds").find((x) => x.inputs.game === "powerball");
      assert.ok(v, "powerball odds vector missing");
      const combos = calculateJackpotCombinations(lotteryOddsConfigFromGame(POWERBALL_CONFIG));
      assert.equal(combos.ok, true);
      if (!combos.ok) return;
      assert.equal(combos.value, v.expected.oneInX);
      assert.equal(combos.value, 292_201_338);
      assert.equal(combos.value, POWERBALL_CONFIG.jackpotOdds);
      assert.equal(v.expected.equal, true);
      const ten = calculateAtLeastOneWin(1 / combos.value, 10);
      assert.equal(ten.ok, true);
      if (!ten.ok) return;
      assert.equal(ten.probability, v.expected.tenTicketProbability);
    });

    it("Mega Millions jackpot odds equal the config value 290,472,336", () => {
      const v = byEngine("odds").find((x) => x.inputs.game === "mega_millions");
      assert.ok(v, "mega millions odds vector missing");
      const combos = calculateJackpotCombinations(lotteryOddsConfigFromGame(MEGA_MILLIONS_CONFIG));
      assert.equal(combos.ok, true);
      if (!combos.ok) return;
      assert.equal(combos.value, v.expected.oneInX);
      assert.equal(combos.value, 290_472_336);
      assert.equal(combos.value, MEGA_MILLIONS_CONFIG.jackpotOdds);
      assert.equal(v.expected.equal, true);
    });
  });

  describe("combinations", () => {
    it("'69 choose 5' = 11,238,513", () => {
      const v = byEngine("combinations")[0];
      assert.ok(v, "combinations vector missing");
      const r = calculateCombinations(69, 5);
      assert.equal(r.ok, true);
      if (!r.ok) return;
      assert.equal(r.value, v.expected.value);
      assert.equal(r.value, 11_238_513);
    });
  });

  describe("generator", () => {
    it("100 Powerball sets: properties match the fixture", () => {
      const v = byEngine("generator")[0];
      assert.ok(v, "generator vector missing");
      const config = generatorConfigFromLotteryConfig(POWERBALL_CONFIG);
      const result = generateTickets(
        config,
        v.inputs.sets,
        { avoidDuplicates: v.inputs.avoidDuplicates },
        sequenceRandomSource(mulberry32(v.inputs.rngSeed)),
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      const tickets = result.tickets;
      assert.equal(tickets.length, 100);
      const expected = v.expected;
      assert.equal(tickets.every((t) => t.mainNumbers.every((n) => n >= 1 && n <= 69)), expected.allMainsInRange);
      assert.equal(
        tickets.every((t) => t.mainNumbers.every((n, i, a) => i === 0 || n > (a[i - 1] as number))),
        expected.allMainsSorted,
      );
      assert.equal(
        tickets.every((t) => new Set(t.mainNumbers).size === t.mainNumbers.length),
        expected.allMainsUniqueWithinTicket,
      );
      assert.equal(tickets.every((t) => t.bonusNumbers.every((n) => n >= 1 && n <= 26)), expected.allBonusesInRange);
      assert.equal(tickets.every((t) => t.mainNumbers.length === 5), expected.allMainsCount5);
      assert.equal(tickets.every((t) => t.bonusNumbers.length === 1), expected.allBonusesCount1);
      assert.deepEqual(tickets[0], expected.firstTicket);
    });
  });

  describe("withholding", () => {
    it("24% of $1M = $240,000 and is reported separately from liability", () => {
      const v = byEngine("withholding")[0];
      assert.ok(v, "withholding vector missing");
      const wh = calculateWithholding(v.inputs.payoutAmount, v.inputs.taxYear, v.inputs.filingStatus, v.inputs.state);
      assert.equal(wh.federalWithholding, 240_000);
      assert.equal(wh.federalWithholding, v.expected.federalWithholding);
      assert.equal(wh.stateWithholding, v.expected.stateWithholding);
      assert.equal(wh.totalWithholding, v.expected.totalWithholding);
      // 24% of the prize, not a hand-waved figure
      assert.equal(wh.federalWithholding, 0.24 * v.inputs.payoutAmount);
      // Liability is a different, computed number
      const liab = calculateLotteryWinnings({
        advertisedJackpot: v.inputs.payoutAmount,
        cashValue: v.inputs.payoutAmount,
        payoutChoice: "lump_sum",
        state: v.inputs.state,
        taxYear: v.inputs.taxYear,
        filingStatus: v.inputs.filingStatus,
      });
      assert.equal(liab.federalTax, v.expected.liabilityFederalTax);
      assert.equal(liab.totalEstimatedTax, v.expected.liabilityTotalTax);
      assert.notEqual(wh.federalWithholding, liab.federalTax);
      assert.equal(v.expected.withholdingSeparateFromLiability, true);
    });
  });
});
