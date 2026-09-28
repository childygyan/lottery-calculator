/**
 * Federal tax engine tests: progressive brackets, boundaries, filing
 * statuses, standard deduction, and end-to-end liability.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateProgressiveTax,
  calculateTaxableIncome,
  calculateFederalTaxLiability,
} from "../src/lib/calculator/federal-tax.ts";
import { getFederalTaxRule } from "../src/data/taxes/federal/index.ts";
import {
  SINGLE_2026_BRACKETS,
  STD_DEDUCTION_2026,
  PROGRESSIVE_CASES,
  LIABILITY_CASES,
} from "./fixtures/federal-2026.ts";

describe("calculateProgressiveTax", () => {
  for (const c of PROGRESSIVE_CASES) {
    it(c.name, () => {
      assert.equal(calculateProgressiveTax(c.income, SINGLE_2026_BRACKETS), c.expected);
    });
  }

  it("handles NaN and Infinity as zero", () => {
    assert.equal(calculateProgressiveTax(NaN, SINGLE_2026_BRACKETS), 0);
    assert.equal(calculateProgressiveTax(Infinity, SINGLE_2026_BRACKETS), 0);
  });

  it("is consistent across all four filing statuses (smoke: no throw, monotonic)", () => {
    for (const status of ["single", "married_jointly", "married_separately", "head_of_household"] as const) {
      const rule = getFederalTaxRule(2026, status);
      assert.ok(rule, `rule exists for ${status}`);
      const t1 = calculateProgressiveTax(1_000_000, rule!.brackets);
      const t2 = calculateProgressiveTax(2_000_000, rule!.brackets);
      assert.ok(t2 > t1, `${status}: tax grows with income`);
    }
  });

  it("married filing separately brackets are half of married filing jointly", () => {
    const mfj = getFederalTaxRule(2026, "married_jointly")!;
    const mfs = getFederalTaxRule(2026, "married_separately")!;
    const mfjCaps = mfj.brackets.map((b) => b.upTo);
    const mfsCaps = mfs.brackets.map((b) => b.upTo);
    assert.deepEqual(
      mfsCaps,
      mfjCaps.map((c) => (c === null ? null : c / 2)),
    );
  });
});

describe("standard deduction (2026)", () => {
  it("matches published IRS figures per filing status", () => {
    for (const status of Object.keys(STD_DEDUCTION_2026) as Array<keyof typeof STD_DEDUCTION_2026>) {
      const rule = getFederalTaxRule(2026, status)!;
      assert.equal(rule.standardDeduction, STD_DEDUCTION_2026[status]);
    }
  });

  it("taxable income subtracts the deduction and never goes below zero", () => {
    const rule = getFederalTaxRule(2026, "single")!;
    assert.equal(calculateTaxableIncome(48_000_000, rule), 47_983_900);
    assert.equal(calculateTaxableIncome(10_000, rule), 0);
    assert.equal(calculateTaxableIncome(0, rule), 0);
  });
});

describe("calculateFederalTaxLiability", () => {
  for (const c of LIABILITY_CASES) {
    it(c.name, () => {
      const { tax, taxableIncome } = calculateFederalTaxLiability(c.winnings, 2026, c.filingStatus);
      assert.equal(taxableIncome, c.expectedTaxable);
      assert.equal(tax, c.expectedTax);
    });
  }

  it("returns zero for unknown tax year / filing status without throwing", () => {
    const r = calculateFederalTaxLiability(1_000_000, 2099, "single");
    assert.equal(r.tax, 0);
  });
});
