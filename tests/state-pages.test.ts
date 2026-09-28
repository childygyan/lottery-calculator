/**
 * State page content/related/context tests (no dist/ needed).
 *
 * Asserts the Phase 3 page-generation inputs: 51 unique slugs, neighbor
 * mappings, per-state content honesty (WV unavailable, CA exempt), and
 * neighbor-contrast variation so no two state pages are thin duplicates.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getStatePageContexts,
  getStateTaxRules,
} from "../src/data/taxes/states/index.ts";
import {
  getStatePageContent,
  getRelatedSlugs,
  EXAMPLE_JACKPOTS,
  EXAMPLE_CASH_VALUE_RATIO,
} from "../src/data/states/index.ts";
import { DEFAULT_TAX_YEAR } from "../src/data/taxes/federal/index.ts";

const YEAR = DEFAULT_TAX_YEAR;

describe("getStatePageContexts", () => {
  it("returns exactly 51 contexts (50 states + DC)", () => {
    assert.equal(getStatePageContexts(YEAR).length, 51);
  });

  it("slugs are unique, lowercase, URL-safe", () => {
    const slugs = getStatePageContexts(YEAR).map((c) => c.slug);
    assert.equal(new Set(slugs).size, 51);
    for (const slug of slugs) {
      assert.match(slug, /^[a-z]+(-[a-z]+)*$/, `bad slug: ${slug}`);
    }
  });

  it("slugs match rule codes 1:1 (no orphan contexts)", () => {
    const bySlug = new Map(getStatePageContexts(YEAR).map((c) => [c.slug, c.rule]));
    for (const rule of getStateTaxRules(YEAR)) {
      assert.ok(bySlug.get(rule.slug)?.code === rule.code, `slug mismatch for ${rule.code}`);
    }
  });
});

describe("getRelatedSlugs", () => {
  it("covers all 51 slugs", () => {
    const contexts = getStatePageContexts(YEAR);
    const keys = contexts.map((c) => c.slug);
    for (const slug of keys) {
      const related = getRelatedSlugs(slug);
      assert.ok(Array.isArray(related), `no mapping for ${slug}`);
    }
    assert.equal(keys.length, 51);
  });

  it("every state has 2-5 related states, all real slugs, never itself", () => {
    const valid = new Set(getStatePageContexts(YEAR).map((c) => c.slug));
    for (const { slug } of getStatePageContexts(YEAR)) {
      const related = getRelatedSlugs(slug);
      assert.ok(related.length >= 2 && related.length <= 5, `${slug}: ${related.length} related`);
      assert.ok(!related.includes(slug), `${slug} links to itself`);
      for (const r of related) assert.ok(valid.has(r), `${slug} -> unknown slug ${r}`);
    }
  });
});

describe("getStatePageContent", () => {
  const rules = getStateTaxRules(YEAR);

  it("returns content for every jurisdiction", () => {
    for (const rule of rules) {
      const content = getStatePageContent(rule, rules);
      assert.ok(content, `no content for ${rule.code}`);
      assert.ok(content!.intro.length > 40, `${rule.code}: intro too short`);
      assert.ok(content!.taxExplanation.length >= 2, `${rule.code}: taxExplanation too short`);
      // WV's page is deliberately FAQ-light: it must not invent answers it can't verify.
      const minFaqs = rule.code === "WV" ? 2 : 4;
      assert.ok(content!.faqs.length >= minFaqs, `${rule.code}: fewer than ${minFaqs} FAQs`);
      assert.ok(
        content!.metaDescription.length >= 100 && content!.metaDescription.length <= 170,
        `${rule.code}: meta description ${content!.metaDescription.length} chars`,
      );
    }
  });

  it("West Virginia content is honest about verification status", () => {
    const wv = rules.find((r) => r.code === "WV")!;
    const content = getStatePageContent(wv, rules)!;
    assert.ok(
      /verification/i.test(content.intro),
      "WV intro must mention verification status",
    );
    assert.ok(
      content.taxExplanation.some((p) => /verification|pending/i.test(p)),
      "WV taxExplanation must say figures are pending",
    );
    assert.ok(
      content.faqs.some((f) => /verification|confirmed|pending/i.test(f.question + f.answer)),
      "WV FAQs must address the unconfirmed status",
    );
  });

  it("California content states the lottery exemption", () => {
    const ca = rules.find((r) => r.code === "CA")!;
    const content = getStatePageContent(ca, rules)!;
    assert.ok(
      content.taxExplanation.some((p) => /excluded from gross income|exempt/i.test(p)),
      "CA content must mention the exemption",
    );
  });

  it("no-tax states name the no-income-tax reason, not a 0% rate", () => {
    for (const rule of rules.filter((r) => r.taxTreatment === "no_state_individual_income_tax")) {
      const content = getStatePageContent(rule, rules)!;
      assert.ok(
        content.taxExplanation.some((p) => /no (broad )?individual income tax/i.test(p)),
        `${rule.code}: must explain the no-income-tax reason`,
      );
    }
  });

  it("neighbor contrast makes every state's taxExplanation unique", () => {
    const seen = new Map<string, string>();
    for (const rule of rules) {
      const content = getStatePageContent(rule, rules)!;
      const key = content.taxExplanation.join("\n").split(rule.name).join("STATE");
      const other = seen.get(key);
      assert.ok(!other, `${rule.code} has identical taxExplanation to ${other}`);
      seen.set(key, rule.code);
    }
  });
});

describe("example constants", () => {
  it("three jackpot tiers, 48% cash-value assumption", () => {
    assert.deepEqual([...EXAMPLE_JACKPOTS], [1_000_000, 10_000_000, 100_000_000]);
    assert.equal(EXAMPLE_CASH_VALUE_RATIO, 0.48);
  });
});
