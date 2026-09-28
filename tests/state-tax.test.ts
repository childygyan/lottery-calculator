/**
 * State tax engine tests.
 *
 * Every configured state rule is tested structurally. Rate values are
 * asserted ONLY for verified rules (against the verified fixture table).
 * West Virginia is asserted as needs_verification — its rate is NOT tested,
 * per the no-unverified-values rule.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateStateTaxLiability } from "../src/lib/calculator/state-tax.ts";
import { getStateTaxRule, getStateTaxRules } from "../src/data/taxes/states/index.ts";
import type { RuleStatus } from "../src/lib/calculator/types.ts";
import {
  VERIFIED_RATES,
  NO_TAX_STATES,
  EXEMPT_STATES,
  ALL_JURISDICTIONS,
} from "./fixtures/states-2026.ts";

const VALID_STATUSES: RuleStatus[] = ["verified", "needs_verification", "not_applicable", "not_supported"];

describe("state rule coverage (2026)", () => {
  it("configures all 51 jurisdictions", () => {
    const rules = getStateTaxRules(2026);
    assert.equal(rules.length, 51);
    const codes = new Set(rules.map((r) => r.code));
    for (const code of ALL_JURISDICTIONS) {
      assert.ok(codes.has(code), `missing rule for ${code}`);
    }
  });

  it("every rule has provenance, a valid status, and a semantic treatment", () => {
    for (const rule of getStateTaxRules(2026)) {
      assert.ok(VALID_STATUSES.includes(rule.status), `${rule.code}: bad status`);
      assert.ok(rule.sourceId.length > 0, `${rule.code}: missing sourceId`);
      assert.ok(rule.lastVerified.length > 0, `${rule.code}: missing lastVerified`);
      assert.ok(rule.effectiveDate.length > 0, `${rule.code}: missing effectiveDate`);
      assert.ok(rule.notes.length > 0, `${rule.code}: missing notes`);
      assert.equal(rule.taxYear, 2026);
      if (rule.status === "verified") {
        assert.ok(rule.taxRate !== null && rule.taxRate > 0, `${rule.code}: verified rule needs a rate`);
      }
    }
  });

  it("verified rates match the Tax Foundation 2026 table", () => {
    for (const [code, taxRate] of Object.entries(VERIFIED_RATES)) {
      const rule = getStateTaxRule(2026, code)!;
      assert.equal(rule.status, "verified", `${code} should be verified`);
      assert.equal(rule.taxRate, taxRate, `${code}: rate mismatch`);
    }
  });

  it("no-income-tax states use the semantic treatment, not just rate 0", () => {
    for (const code of NO_TAX_STATES) {
      const rule = getStateTaxRule(2026, code)!;
      assert.equal(rule.taxTreatment, "no_state_individual_income_tax", code);
      assert.equal(rule.incomeTaxApplicable, false, code);
      assert.equal(rule.status, "not_applicable", code);
    }
  });

  it("special exemptions are explicit (California)", () => {
    for (const { code, treatment } of EXEMPT_STATES) {
      const rule = getStateTaxRule(2026, code)!;
      assert.equal(rule.taxTreatment, treatment, code);
    }
  });

  it("West Virginia is flagged needs_verification (rate not asserted)", () => {
    const rule = getStateTaxRule(2026, "WV")!;
    assert.equal(rule.status, "needs_verification");
  });

  it("lookup is case-insensitive and returns undefined for unknown codes", () => {
    assert.equal(getStateTaxRule(2026, "ny")?.code, "NY");
    assert.equal(getStateTaxRule(2026, "XX"), undefined);
    assert.equal(getStateTaxRule(2099, "NY"), undefined);
  });
});

describe("calculateStateTaxLiability", () => {
  it("applies the configured rate (NY 10.9% on $48M)", () => {
    const { tax } = calculateStateTaxLiability(48_000_000, 2026, "NY");
    assert.equal(tax, 5_232_000);
  });

  it("returns 0 for no-tax states and exempt states", () => {
    for (const code of [...NO_TAX_STATES, "CA"]) {
      const { tax } = calculateStateTaxLiability(48_000_000, 2026, code);
      assert.equal(tax, 0, code);
    }
  });

  it("returns 0 for unknown states and non-positive amounts", () => {
    assert.equal(calculateStateTaxLiability(48_000_000, 2026, "XX").tax, 0);
    assert.equal(calculateStateTaxLiability(0, 2026, "NY").tax, 0);
    assert.equal(calculateStateTaxLiability(-5, 2026, "NY").tax, 0);
  });
});
