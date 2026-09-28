/**
 * Formatting tests: exact currency, grouped whole dollars, percents,
 * input parsing, and cent-rounding of float artifacts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  roundToCents,
  formatCurrency,
  formatCurrencyExact,
  formatPercent,
  parseCurrencyInput,
} from "../src/lib/calculator/formatting.ts";

describe("formatCurrencyExact", () => {
  it("formats $1, $1,000, $1,000,000, $1,000,000,000", () => {
    assert.equal(formatCurrencyExact(1), "$1.00");
    assert.equal(formatCurrencyExact(1000), "$1,000.00");
    assert.equal(formatCurrencyExact(1000000), "$1,000,000.00");
    assert.equal(formatCurrencyExact(1000000000), "$1,000,000,000.00");
  });

  it("formats cents", () => {
    assert.equal(formatCurrencyExact(1234567.891), "$1,234,567.89");
    assert.equal(formatCurrencyExact(0.99), "$0.99");
  });

  it("handles zero and negatives safely", () => {
    assert.equal(formatCurrencyExact(0), "$0.00");
    assert.equal(formatCurrencyExact(NaN), "$0.00");
    assert.equal(formatCurrencyExact(-5), "-$5.00");
  });
});

describe("formatCurrency (whole dollars)", () => {
  it("rounds to whole dollars", () => {
    assert.equal(formatCurrency(1234567.89), "$1,234,568");
    assert.equal(formatCurrency(1000000), "$1,000,000");
  });
});

describe("formatPercent", () => {
  it("formats an effective rate with two decimals", () => {
    assert.equal(formatPercent(0.47795834), "47.80%");
    assert.equal(formatPercent(0), "0.00%");
  });
});

describe("parseCurrencyInput", () => {
  it("accepts plain numbers, $, commas, spaces, decimals", () => {
    assert.equal(parseCurrencyInput("1000000"), 1_000_000);
    assert.equal(parseCurrencyInput("$1,000,000"), 1_000_000);
    assert.equal(parseCurrencyInput(" $48,000,000.50 "), 48_000_000.5);
    assert.equal(parseCurrencyInput("1234.5"), 1234.5);
  });

  it("rejects empties, negatives, garbage, and bad decimals", () => {
    assert.equal(parseCurrencyInput(""), null);
    assert.equal(parseCurrencyInput("   "), null);
    assert.equal(parseCurrencyInput("-100"), null);
    assert.equal(parseCurrencyInput("abc"), null);
    assert.equal(parseCurrencyInput("1,2,3"), null);
    assert.equal(parseCurrencyInput("10.555"), null);
    assert.equal(parseCurrencyInput("$"), null);
  });
});

describe("roundToCents", () => {
  it("kills floating-point artifacts (0.1 + 0.2)", () => {
    assert.equal(roundToCents(0.1 + 0.2), 0.3);
  });

  it("rounds halves of a cent correctly", () => {
    assert.equal(roundToCents(1.005), 1.0 + 0.01); // 1.01 within float epsilon
    assert.equal(roundToCents(1.004), 1.0);
  });

  it("zero-safes non-finite input", () => {
    assert.equal(roundToCents(NaN), 0);
    assert.equal(roundToCents(Infinity), 0);
  });
});
