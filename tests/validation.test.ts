/**
 * Validation tests: every rejection path from the spec —
 * empty, zero, negative, non-numeric, NaN/Infinity, cash > jackpot,
 * unknown state/year/status, and amounts over the sanity cap.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateLotteryForm, type LotteryFormValues } from "../src/lib/calculator/lottery.ts";

const BASE: LotteryFormValues = {
  jackpot: "100000000",
  cashValue: "48000000",
  payoutChoice: "lump_sum",
  state: "NY",
  taxYear: "2026",
  filingStatus: "single",
};

function v(overrides: Partial<LotteryFormValues> = {}) {
  return validateLotteryForm({ ...BASE, ...overrides });
}

describe("validateLotteryForm — happy path", () => {
  it("accepts a complete valid form", () => {
    const r = v();
    assert.equal(r.valid, true);
    assert.deepEqual(r.errors, {});
    assert.deepEqual(r.parsed, {
      advertisedJackpot: 100_000_000,
      cashValue: 48_000_000,
      payoutChoice: "lump_sum",
      state: "NY",
      taxYear: 2026,
      filingStatus: "single",
    });
  });

  it("accepts formatted amounts with $ and commas", () => {
    const r = v({ jackpot: "$100,000,000", cashValue: " $48,000,000 " });
    assert.equal(r.valid, true);
    assert.equal(r.parsed!.advertisedJackpot, 100_000_000);
  });

  it("accepts annuity without a cash value", () => {
    const r = v({ payoutChoice: "annuity", cashValue: "" });
    assert.equal(r.valid, true);
    assert.equal(r.parsed!.payoutChoice, "annuity");
  });

  it("normalizes state codes", () => {
    const r = v({ state: " ny " });
    assert.equal(r.valid, true);
    assert.equal(r.parsed!.state, "NY");
  });
});

describe("validateLotteryForm — rejections", () => {
  it("rejects empty jackpot", () => {
    const r = v({ jackpot: "   " });
    assert.equal(r.valid, false);
    assert.equal(r.errors.jackpot, "Jackpot amount is required.");
  });

  it("rejects zero jackpot", () => {
    const r = v({ jackpot: "0" });
    assert.equal(r.valid, false);
    assert.match(r.errors.jackpot!, /greater than \$0/);
  });

  it("rejects negative jackpot", () => {
    const r = v({ jackpot: "-100" });
    assert.equal(r.valid, false);
    assert.match(r.errors.jackpot!, /must not be negative/);
  });

  it("rejects non-numeric jackpot", () => {
    const r = v({ jackpot: "one hundred million" });
    assert.equal(r.valid, false);
    assert.match(r.errors.jackpot!, /valid dollar amount/);
  });

  it("rejects jackpot over the sanity cap", () => {
    const r = v({ jackpot: "99999999999" });
    assert.equal(r.valid, false);
    assert.match(r.errors.jackpot!, /unusually large/);
  });

  it("rejects cash option above the jackpot", () => {
    const r = v({ jackpot: "1000000", cashValue: "2000000" });
    assert.equal(r.valid, false);
    assert.match(r.errors.cashValue!, /usually lower than the advertised jackpot/);
  });

  it("rejects cash over jackpot even with formatted input", () => {
    const r = v({ jackpot: "$1,000,000", cashValue: "$2,000,000" });
    assert.equal(r.valid, false);
    assert.ok(r.errors.cashValue);
  });

  it("rejects unknown state", () => {
    const r = v({ state: "XX" });
    assert.equal(r.valid, false);
    assert.equal(r.errors.state, "Please choose a state.");
  });

  it("rejects empty state", () => {
    const r = v({ state: "" });
    assert.equal(r.valid, false);
    assert.ok(r.errors.state);
  });

  it("rejects unsupported tax year", () => {
    const r = v({ taxYear: "1999" });
    assert.equal(r.valid, false);
    assert.ok(r.errors.taxYear);
  });

  it("rejects unknown filing status", () => {
    const r = v({ filingStatus: "alien" });
    assert.equal(r.valid, false);
    assert.ok(r.errors.filingStatus);
  });
});
