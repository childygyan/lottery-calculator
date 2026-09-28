/**
 * Phase 5 tests: annuity engine, payout comparison, jackpot data model.
 *
 * Covers: schedule building (fixed/growing/monthly), cent adjustment,
 * per-payment taxation, payout validation, cash-vs-annuity comparison,
 * URL amount sanitization, verified game annuity structures, and the
 * jackpot amount data model. No dist/ needed.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildAnnuitySchedule,
  calculateAnnuityTaxes,
  validateAnnuityScheduleInput,
  MAX_ANNUITY_PAYMENTS,
} from "../src/lib/calculator/index.ts";
import {
  calculatePayoutComparison,
  validatePayoutForm,
  parseShareableAmount,
  DEFAULT_ANNUITY_YEARS,
  MAX_PAYOUT_ANNUITY_YEARS,
} from "../src/lib/calculator/index.ts";
import { calculateLotteryWinnings } from "../src/lib/calculator/index.ts";
import { calculateFederalTaxLiability } from "../src/lib/calculator/index.ts";
import { calculateWithholding } from "../src/lib/calculator/index.ts";
import {
  POWERBALL_CONFIG,
  MEGA_MILLIONS_CONFIG,
} from "../src/data/lotteries/index.ts";
import {
  getAllJackpotAmounts,
  PAYOUT_PRESETS,
} from "../src/data/jackpots.ts";

const BASE_VALUES = {
  jackpot: "100,000,000",
  cashValue: "48,000,000",
  annuityYears: "30",
  annualIncrease: "0",
  state: "TX",
  taxYear: "2026",
  filingStatus: "single",
};

function validParsed(overrides = {}) {
  const v = validatePayoutForm({ ...BASE_VALUES, ...overrides });
  assert.ok(v.valid && v.parsed, `expected valid: ${JSON.stringify(v.errors)}`);
  return v.parsed;
}

describe("annuity schedule validation", () => {
  it("accepts a valid schedule", () => {
    const r = validateAnnuityScheduleInput({
      totalAdvertisedValue: 100_000_000,
      numberOfPayments: 30,
      paymentFrequency: "annual",
      growthRate: 0,
    });
    assert.ok(r.valid && r.parsed);
    assert.equal(r.parsed.numberOfPayments, 30);
  });

  it("rejects zero or negative totals", () => {
    for (const total of [0, -5, NaN]) {
      const r = validateAnnuityScheduleInput({ totalAdvertisedValue: total, numberOfPayments: 30 });
      assert.ok(!r.valid, `total ${total} should be invalid`);
    }
  });

  it("rejects payment counts outside 1..600", () => {
    for (const n of [0, 1.5, 601]) {
      const r = validateAnnuityScheduleInput({ totalAdvertisedValue: 100, numberOfPayments: n });
      assert.ok(!r.valid, `count ${n} should be invalid`);
    }
    assert.equal(MAX_ANNUITY_PAYMENTS, 600);
    const ok = validateAnnuityScheduleInput({ totalAdvertisedValue: 100, numberOfPayments: 600 });
    assert.ok(ok.valid);
  });

  it("rejects bad frequencies and growth rates", () => {
    const badFreq = validateAnnuityScheduleInput({
      totalAdvertisedValue: 100,
      numberOfPayments: 10,
      paymentFrequency: "weekly" as never,
    });
    assert.ok(!badFreq.valid);
    for (const g of [-0.1, 1, 2, NaN]) {
      const r = validateAnnuityScheduleInput({
        totalAdvertisedValue: 100,
        numberOfPayments: 10,
        growthRate: g,
      });
      assert.ok(!r.valid, `growth ${g} should be invalid`);
    }
  });
});

describe("buildAnnuitySchedule", () => {
  it("builds 30 equal annual payments that total exactly", () => {
    const s = buildAnnuitySchedule({
      totalAdvertisedValue: 100_000_000,
      numberOfPayments: 30,
      paymentFrequency: "annual",
      growthRate: 0,
    });
    assert.equal(s.length, 30);
    const total = s.reduce((sum, p) => sum + p.paymentAmount, 0);
    assert.equal(Math.round(total * 100), 100_000_000_00);
    assert.ok(s.every((p, i) => p.paymentNumber === i + 1));
    assert.ok(s.every((p) => Math.abs(p.paymentAmount - 100_000_000 / 30) < 0.5));
  });

  it("adjusts the final payment so odd totals match to the cent", () => {
    const s = buildAnnuitySchedule({
      totalAdvertisedValue: 1_000_000,
      numberOfPayments: 7,
      paymentFrequency: "annual",
      growthRate: 0,
    });
    const total = s.reduce((sum, p) => sum + p.paymentAmount, 0);
    assert.equal(Math.round(total * 100), 1_000_000_00);
    assert.equal(Math.round(s[6]!.cumulativeAmount * 100), 1_000_000_00);
  });

  it("builds a growing schedule where each payment is larger than the last", () => {
    const s = buildAnnuitySchedule({
      totalAdvertisedValue: 100_000_000,
      numberOfPayments: 30,
      paymentFrequency: "annual",
      growthRate: 0.05,
    });
    assert.equal(s.length, 30);
    const total = s.reduce((sum, p) => sum + p.paymentAmount, 0);
    assert.equal(Math.round(total * 100), 100_000_000_00);
    assert.ok(s[0]!.paymentAmount < s[29]!.paymentAmount);
    // ~5% growth between consecutive payments (allowing cent rounding)
    for (let i = 1; i < 30; i++) {
      const ratio = s[i]!.paymentAmount / s[i - 1]!.paymentAmount;
      assert.ok(Math.abs(ratio - 1.05) < 0.001, `ratio at ${i}: ${ratio}`);
    }
  });

  it("supports monthly schedules", () => {
    const s = buildAnnuitySchedule({
      totalAdvertisedValue: 1_200_000,
      numberOfPayments: 12,
      paymentFrequency: "monthly",
      growthRate: 0,
    });
    assert.equal(s.length, 12);
    assert.ok(s.every((p) => p.paymentAmount === 100_000));
  });

  it("handles a single payment", () => {
    const s = buildAnnuitySchedule({
      totalAdvertisedValue: 5_000_000,
      numberOfPayments: 1,
      paymentFrequency: "annual",
      growthRate: 0.05,
    });
    assert.equal(s.length, 1);
    assert.equal(s[0]!.paymentAmount, 5_000_000);
  });

  it("returns [] for invalid input", () => {
    assert.deepEqual(
      buildAnnuitySchedule({ totalAdvertisedValue: 0, numberOfPayments: 30 }),
      [],
    );
  });

  it("tiny and very large values keep cent-exact totals", () => {
    for (const total of [1, 1000, 1_000_000_000, 10_000_000_000]) {
      const s = buildAnnuitySchedule({
        totalAdvertisedValue: total,
        numberOfPayments: 30,
        paymentFrequency: "annual",
        growthRate: 0.05,
      });
      const sum = s.reduce((x, p) => x + p.paymentAmount, 0);
      assert.equal(Math.round(sum * 100), Math.round(total * 100), `total ${total}`);
    }
  });
});

describe("calculateAnnuityTaxes", () => {
  const schedule = buildAnnuitySchedule({
    totalAdvertisedValue: 30_000_000,
    numberOfPayments: 30,
    paymentFrequency: "annual",
    growthRate: 0,
  });
  const payments = schedule.map((p) => p.paymentAmount);

  it("taxes each payment with the same federal engine as the lump-sum calculator", () => {
    const taxed = calculateAnnuityTaxes({
      payments,
      state: "TX",
      filingStatus: "single",
      taxYear: 2026,
    });
    const expected = calculateFederalTaxLiability(payments[0]!, 2026, "single");
    assert.equal(taxed.payments[0]!.federalTax, expected.tax);
    assert.equal(taxed.payments.length, 30);
  });

  it("honors the California lottery exemption per payment", () => {
    const taxed = calculateAnnuityTaxes({
      payments,
      state: "CA",
      filingStatus: "single",
      taxYear: 2026,
    });
    assert.ok(taxed.payments.every((p) => p.stateTax === 0));
  });

  it("totals, cumulatives, and averages are internally consistent", () => {
    const taxed = calculateAnnuityTaxes({
      payments,
      state: "TX",
      filingStatus: "single",
      taxYear: 2026,
    });
    assert.equal(taxed.totalGross, 30_000_000);
    const last = taxed.payments[29]!;
    assert.equal(last.cumulativeGross, 30_000_000);
    assert.equal(last.cumulativeNet, taxed.totalNet);
    assert.equal(
      Math.round(taxed.averageEffectiveRate * 1000),
      Math.round((taxed.totalTax / taxed.totalGross) * 1000),
    );
    assert.ok(
      taxed.payments.every(
        (p) => p.netPayment === Math.round((p.grossPayment - p.totalTax) * 100) / 100,
      ),
    );
  });

  it("returns per-payment withholding separate from liability", () => {
    const taxed = calculateAnnuityTaxes({
      payments,
      state: "TX",
      filingStatus: "single",
      taxYear: 2026,
    });
    assert.equal(taxed.withholding.length, 30);
    const expected = calculateWithholding(payments[0]!, 2026, "single", "TX");
    assert.equal(taxed.withholding[0]!.federalWithholding, expected.federalWithholding);
    // Withholding is not added on top of the tax bill:
    assert.ok(taxed.totalTax < taxed.totalGross * 0.5);
  });

  it("exposes the state data status", () => {
    const taxed = calculateAnnuityTaxes({
      payments,
      state: "WV",
      filingStatus: "single",
      taxYear: 2026,
    });
    assert.equal(taxed.stateDataStatus, "needs_verification");
  });
});

describe("payout form validation", () => {
  it("requires a user-entered cash value", () => {
    const v = validatePayoutForm({ ...BASE_VALUES, cashValue: "" });
    assert.ok(!v.valid);
    assert.ok(v.errors.cashValue);
  });

  it("rejects a cash value above the jackpot", () => {
    const v = validatePayoutForm({
      ...BASE_VALUES,
      jackpot: "100,000,000",
      cashValue: "120,000,000",
    });
    assert.ok(!v.valid);
    assert.match(v.errors.cashValue ?? "", /usually lower/i);
  });

  it("caps annuity years and validates the increase", () => {
    const v = validatePayoutForm({ ...BASE_VALUES, annuityYears: "51" });
    assert.ok(!v.valid && v.errors.annuityYears);
    assert.equal(MAX_PAYOUT_ANNUITY_YEARS, 50);
    const v2 = validatePayoutForm({ ...BASE_VALUES, annualIncrease: "101" });
    assert.ok(!v2.valid && v2.errors.annualIncrease);
    const ok = validatePayoutForm({ ...BASE_VALUES, annuityYears: "50", annualIncrease: "5" });
    assert.ok(ok.valid && ok.parsed);
    assert.equal(ok.parsed.annuityYears, 50);
    assert.equal(ok.parsed.annualIncrease, 0.05);
  });

  it("defaults annuity years to 30", () => {
    assert.equal(DEFAULT_ANNUITY_YEARS, 30);
    const v = validatePayoutForm({ ...BASE_VALUES, annuityYears: "" });
    assert.ok(v.valid && v.parsed);
    assert.equal(v.parsed.annuityYears, 30);
  });

  it("rejects zero, negative, and $0-style inputs", () => {
    for (const cashValue of ["0", "-5"]) {
      const v = validatePayoutForm({ ...BASE_VALUES, cashValue });
      assert.ok(!v.valid, `cash "${cashValue}" should be invalid`);
    }
  });
});

describe("calculatePayoutComparison", () => {
  it("cash side delegates to the existing lottery calculation", () => {
    const parsed = validParsed();
    const comparison = calculatePayoutComparison(parsed);
    const direct = calculateLotteryWinnings({
      advertisedJackpot: parsed.advertisedJackpot,
      cashValue: parsed.cashValue,
      payoutChoice: "lump_sum",
      state: parsed.state,
      taxYear: parsed.taxYear,
      filingStatus: parsed.filingStatus,
    });
    assert.equal(comparison.cash.gross, parsed.cashValue);
    assert.equal(comparison.cash.net, direct.estimatedTakeHome);
    assert.equal(comparison.cash.totalTax, direct.totalEstimatedTax);
    assert.equal(comparison.cash.federalWithholding, direct.federalWithholding);
  });

  it("annuity side taxes payment-by-payment and totals the jackpot", () => {
    const comparison = calculatePayoutComparison(validParsed());
    assert.equal(comparison.annuity.schedule.payments.length, 30);
    assert.equal(Math.round(comparison.annuity.gross), 100_000_000);
    // 0% growth: first and last payments are equal (within cent adjustment)
    assert.ok(
      Math.abs(comparison.annuity.firstPayment - comparison.annuity.lastPayment) < 1,
    );
    assert.ok(comparison.annuity.totalTax > 0);
    assert.ok(comparison.annuity.net < comparison.annuity.gross);
  });

  it("growing annuity matches the Mega Millions 5% structure", () => {
    const comparison = calculatePayoutComparison(validParsed({ annualIncrease: "5" }));
    assert.ok(comparison.annuity.firstPayment < comparison.annuity.lastPayment);
    assert.match(comparison.annuity.paymentStructure, /5\.00%/);
  });

  it("annuity withholding sums the per-payment withholding", () => {
    const comparison = calculatePayoutComparison(validParsed());
    const expected = comparison.annuity.schedule.withholding.reduce(
      (sum, w) => sum + w.federalWithholding,
      0,
    );
    assert.equal(
      Math.round(comparison.annuity.federalWithholding * 100),
      Math.round(expected * 100),
    );
  });

  it("never recommends an option — assumptions only", () => {
    const comparison = calculatePayoutComparison(validParsed());
    assert.ok(!("recommendation" in comparison));
    assert.ok(!("betterOption" in comparison));
    assert.ok(comparison.assumptions.length >= 3);
    assert.ok(comparison.assumptions.every((a) => typeof a === "string"));
    const joined = comparison.assumptions.join(" ").toLowerCase();
    assert.ok(!joined.includes("cash is better") && !joined.includes("annuity is better"));
  });
});

describe("parseShareableAmount", () => {
  it("sanitizes the ?amount= URL parameter", () => {
    assert.equal(parseShareableAmount("1,000"), 1000);
    assert.equal(parseShareableAmount("$1000000"), 1_000_000);
    assert.equal(parseShareableAmount("1000000000"), 1_000_000_000);
  });

  it("rejects missing, malformed, zero, negative, and over-cap values", () => {
    for (const raw of [null, undefined, "", "abc", "0", "-5", "1.2.3", "99999999999"]) {
      assert.equal(parseShareableAmount(raw), null, `raw ${String(raw)} should be null`);
    }
  });
});

describe("verified game annuity structures", () => {
  it("Powerball: 30 graduated payments, no invented growth rate", () => {
    assert.equal(POWERBALL_CONFIG.annuity?.numberOfPayments, 30);
    assert.equal(POWERBALL_CONFIG.annuity?.paymentFrequency, "annual");
    assert.equal(POWERBALL_CONFIG.annuity?.growthRate, null);
    assert.match(POWERBALL_CONFIG.annuity?.notes ?? "", /no fixed/i);
  });

  it("Mega Millions: 30 payments, 5% growth, immediate first payment", () => {
    assert.equal(MEGA_MILLIONS_CONFIG.annuity?.numberOfPayments, 30);
    assert.equal(MEGA_MILLIONS_CONFIG.annuity?.paymentFrequency, "annual");
    assert.equal(MEGA_MILLIONS_CONFIG.annuity?.growthRate, 0.05);
    assert.match(MEGA_MILLIONS_CONFIG.annuity?.firstPaymentDescription ?? "", /immediate/i);
  });
});

describe("jackpot amount data model", () => {
  it("has exactly five unique amount pages", () => {
    const amounts = getAllJackpotAmounts();
    assert.equal(amounts.length, 5);
    const slugs = amounts.map((a) => a.slug);
    assert.deepEqual([...slugs].sort(), ["1-billion", "1-million", "10-million", "100-million", "500-million"]);
    const titles = amounts.map((a) => a.title);
    assert.equal(new Set(titles).size, 5, "titles must be unique");
    const descriptions = amounts.map((a) => a.description);
    assert.equal(new Set(descriptions).size, 5, "descriptions must be unique");
  });

  it("each amount has FAQs and non-empty content sections", () => {
    for (const a of getAllJackpotAmounts()) {
      assert.ok(a.h1.length > 0, `${a.slug} h1`);
      assert.ok(a.lede.length > 0, `${a.slug} lede`);
      assert.ok(a.afterTaxBody.length >= 2, `${a.slug} afterTaxBody`);
      assert.ok(a.cashAnnuityBody.length >= 2, `${a.slug} cashAnnuityBody`);
      assert.ok(a.contextBullets.length >= 3, `${a.slug} contextBullets`);
      assert.ok(a.faqs.length >= 3, `${a.slug} faqs`);
      assert.ok(a.faqs.every((f) => f.question.length > 0 && f.answer.length > 0));
    }
  });

  it("presets are sorted and within the $10B cap", () => {
    const sorted = [...PAYOUT_PRESETS].sort((a, b) => a.amount - b.amount);
    assert.deepEqual(PAYOUT_PRESETS, sorted);
    assert.ok(PAYOUT_PRESETS.every((p) => p.amount > 0 && p.amount <= 10_000_000_000));
  });
});
