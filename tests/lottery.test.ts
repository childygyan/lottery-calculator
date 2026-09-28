/**
 * End-to-end lottery calculation tests: lump sum at $1M/$10M/$100M/$1B,
 * annuity mode, and the withholding-vs-liability separation.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateLotteryWinnings,
  MAX_JACKPOT_USD,
  type LotteryCalculatorInput,
} from "../src/lib/calculator/lottery.ts";
import { calculateWithholding } from "../src/lib/calculator/withholding.ts";
import { ANNUITY_YEARS } from "../src/lib/calculator/annuity.ts";

function input(overrides: Partial<LotteryCalculatorInput> = {}): LotteryCalculatorInput {
  return {
    advertisedJackpot: 100_000_000,
    cashValue: 48_000_000,
    payoutChoice: "lump_sum",
    state: "NY",
    taxYear: 2026,
    filingStatus: "single",
    ...overrides,
  };
}

describe("calculateLotteryWinnings — lump sum", () => {
  it("$100M jackpot / $48M cash, NY, single, 2026", () => {
    const r = calculateLotteryWinnings(input());
    assert.equal(r.advertisedJackpot, 100_000_000);
    assert.equal(r.cashValue, 48_000_000);
    assert.equal(r.taxableAmount, 48_000_000);
    assert.equal(r.federalTax, 17_710_000.25);
    assert.equal(r.stateTax, 5_232_000);
    assert.equal(r.totalEstimatedTax, 22_942_000.25);
    assert.equal(r.estimatedTakeHome, 25_057_999.75);
    assert.ok(Math.abs(r.estimatedEffectiveTaxRate - 0.47795834) < 1e-6);
    assert.equal(r.taxYear, 2026);
    assert.equal(r.state, "NY");
    assert.equal(r.filingStatus, "single");
    assert.equal(r.stateDataStatus, "verified");
  });

  it("$10M jackpot / $4.8M cash, NY, single", () => {
    const r = calculateLotteryWinnings(
      input({ advertisedJackpot: 10_000_000, cashValue: 4_800_000 }),
    );
    assert.equal(r.federalTax, 1_726_000.25);
    assert.equal(r.stateTax, 523_200);
    assert.equal(r.totalEstimatedTax, 2_249_200.25);
    assert.equal(r.estimatedTakeHome, 2_550_799.75);
  });

  it("$1M jackpot / $480k cash, NY, single", () => {
    const r = calculateLotteryWinnings(
      input({ advertisedJackpot: 1_000_000, cashValue: 480_000 }),
    );
    assert.equal(r.federalTax, 131_134.25);
    assert.equal(r.stateTax, 52_320);
    assert.equal(r.totalEstimatedTax, 183_454.25);
    assert.equal(r.estimatedTakeHome, 296_545.75);
  });

  it("$1B jackpot / $480M cash, TX (no state tax), single", () => {
    const r = calculateLotteryWinnings(
      input({ advertisedJackpot: 1_000_000_000, cashValue: 480_000_000, state: "TX" }),
    );
    assert.equal(r.federalTax, 177_550_000.25);
    assert.equal(r.stateTax, 0);
    assert.equal(r.totalEstimatedTax, 177_550_000.25);
    assert.equal(r.estimatedTakeHome, 302_449_999.75);
    assert.equal(r.stateDataStatus, "not_applicable");
  });

  it("married filing jointly pays less federal tax than single on the same win", () => {
    const single = calculateLotteryWinnings(input({ filingStatus: "single" }));
    const joint = calculateLotteryWinnings(input({ filingStatus: "married_jointly" }));
    assert.ok(joint.federalTax < single.federalTax);
    assert.equal(joint.stateTax, single.stateTax);
  });

  it("flags states whose data needs verification (WV)", () => {
    const r = calculateLotteryWinnings(input({ state: "WV" }));
    assert.equal(r.stateDataStatus, "needs_verification");
  });

  it("result is JSON-serializable", () => {
    const r = calculateLotteryWinnings(input());
    assert.deepEqual(JSON.parse(JSON.stringify(r)), r);
  });
});

describe("calculateLotteryWinnings — annuity", () => {
  it("$100M annuity: taxable amount is one annual payment", () => {
    const r = calculateLotteryWinnings(input({ payoutChoice: "annuity" }));
    assert.equal(r.payoutChoice, "annuity");
    assert.equal(r.annuityYears, ANNUITY_YEARS);
    assert.equal(r.annualAnnuityPayment, 3_333_333.33);
    assert.equal(r.taxableAmount, 3_333_333.33);
    // Annuity take-home (one year) is far below the lump-sum take-home.
    const lump = calculateLotteryWinnings(input({ payoutChoice: "lump_sum" }));
    assert.ok(r.estimatedTakeHome < lump.estimatedTakeHome);
    // Sanity: federal tax ≈ hand computation within a cent.
    assert.ok(Math.abs(r.federalTax - 1_183_333.58) < 0.02);
    assert.equal(r.stateTax, 363_333.33);
  });
});

describe("withholding vs liability", () => {
  it("withholding is reported separately and is not the final tax", () => {
    const r = calculateLotteryWinnings(input());
    // 24% federal withholding on the $48M payout.
    assert.equal(r.federalWithholding, 11_520_000);
    // No single verifiable NY withholding figure -> null, never silent 0.
    assert.equal(r.stateWithholding, null);
    assert.equal(r.totalWithholding, 11_520_000);
    // Liability differs from withholding (progressive tax > flat 24% here).
    assert.ok(r.totalEstimatedTax > r.totalWithholding);
    // Take-home subtracts LIABILITY, not withholding.
    assert.equal(r.estimatedTakeHome, r.taxableAmount - r.totalEstimatedTax);
  });

  it("no federal withholding under the $5,000 threshold", () => {
    const w = calculateWithholding(4000, 2026, "single", "NY");
    assert.equal(w.federalWithholding, 0);
  });

  it("withholding is zero-safe for bad input", () => {
    const w = calculateWithholding(NaN, 2026, "single", "NY");
    assert.deepEqual(w, { federalWithholding: 0, stateWithholding: null, totalWithholding: 0 });
  });
});

describe("input caps", () => {
  it("MAX_JACKPOT_USD is $10B", () => {
    assert.equal(MAX_JACKPOT_USD, 10_000_000_000);
  });
});
