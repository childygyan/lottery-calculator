/**
 * Phase 8 tests for the three new Powerball pages
 * (powerball-payout-chart, powerball-jackpot-analysis,
 * powerball-annuity-calculator) and the annuity-schedule math behind the
 * PowerballAnnuityScheduler component.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildAnnuitySchedule,
  validateAnnuityScheduleInput,
} from "../src/lib/calculator/index.ts";
import { pageHtml } from "./dom-utils.ts";

const PAGES = [
  "powerball-payout-chart/index.html",
  "powerball-jackpot-analysis/index.html",
  "powerball-annuity-calculator/index.html",
];

function titleOf(html: string): string {
  const m = html.match(/<title>([\s\S]*?)<\/title>/);
  assert.ok(m, "page must have a <title>");
  return (m[1] ?? "").replace(/&amp;/g, "&");
}

function h1Count(html: string): number {
  return (html.match(/<h1\b[\s\S]*?<\/h1>/g) ?? []).length;
}

describe("new Powerball pages — shared structure", () => {
  it("all three pages exist in dist/", () => {
    for (const p of PAGES) {
      assert.doesNotThrow(() => pageHtml(p), `missing dist page: ${p}`);
    }
  });

  it("each page has exactly one <h1>", () => {
    for (const p of PAGES) {
      assert.equal(h1Count(pageHtml(p)), 1, `${p}: expected exactly one h1`);
    }
  });

  it("titles are unique across the three pages", () => {
    const titles = PAGES.map((p) => titleOf(pageHtml(p)));
    assert.equal(new Set(titles).size, 3, `titles not unique: ${titles.join(" | ")}`);
  });
});

describe("powerball-payout-chart", () => {
  const html = pageHtml("powerball-payout-chart/index.html");

  it("H1 names the payout chart", () => {
    assert.match(html, /<h1\b[\s\S]*?Powerball Payout Chart[\s\S]*?<\/h1>/);
  });

  it("lists all 9 Powerball prize tiers (table data rows)", () => {
    const tables = html.match(/<table[\s\S]*?<\/table>/g) ?? [];
    assert.ok(tables.length > 0, "payout chart page must contain a table");
    const dataRows = ((tables[0] ?? "").match(/<tr[\s\S]*?<\/tr>/g) ?? []).filter((r) =>
      /<td[\s>]/.test(r),
    );
    assert.equal(dataRows.length, 9, `expected 9 prize-tier rows, found ${dataRows.length}`);
  });

  it("shows the jackpot odds 292,201,338", () => {
    assert.ok(html.includes("292,201,338"), "jackpot odds 292,201,338 missing");
  });
});

describe("powerball-jackpot-analysis", () => {
  const html = pageHtml("powerball-jackpot-analysis/index.html");

  it("H1 names the jackpot analysis", () => {
    assert.match(html, /<h1\b[\s\S]*?Powerball Jackpot Analysis[\s\S]*?<\/h1>/);
  });

  it("links to the Powerball payout calculator", () => {
    assert.ok(
      html.includes('href="/powerball-payout-calculator/"'),
      "jackpot-analysis page must link to /powerball-payout-calculator/",
    );
  });
});

describe("powerball-annuity-calculator", () => {
  const html = pageHtml("powerball-annuity-calculator/index.html");

  it("H1 names the annuity calculator", () => {
    assert.match(html, /<h1\b[\s\S]*?Powerball Annuity Calculator[\s\S]*?<\/h1>/);
  });

  it("references the 30-payment annuity structure", () => {
    assert.ok(
      /30 annual|30 payments|30-payment/.test(html),
      "annuity page must reference the 30-payment structure",
    );
  });
});

describe("buildAnnuitySchedule engine vectors", () => {
  it("30 annual payments on a $500M jackpot at 0% growth: 30 equal payments summing to $500M", () => {
    const schedule = buildAnnuitySchedule({
      totalAdvertisedValue: 500_000_000,
      numberOfPayments: 30,
    });
    assert.equal(schedule.length, 30);
    const total = schedule.reduce((sum, p) => sum + p.paymentAmount, 0);
    assert.ok(Math.abs(total - 500_000_000) < 0.01, `sum ${total} != 500,000,000`);
    // Real engine output: first payment 16,666,666.67, final adjusted payment
    // 16,666,666.57 so the total lands exactly.
    assert.equal(schedule[0]?.paymentAmount, 16_666_666.67);
    assert.equal(schedule[29]?.paymentAmount, 16_666_666.57);
    for (const p of schedule.slice(0, 29)) {
      assert.equal(p.paymentAmount, 16_666_666.67);
    }
    assert.deepEqual(
      schedule.map((p) => p.paymentNumber),
      Array.from({ length: 30 }, (_, i) => i + 1),
    );
  });

  it("30 payments at 5% growth: geometric series summing to $500M, last payment > first", () => {
    const schedule = buildAnnuitySchedule({
      totalAdvertisedValue: 500_000_000,
      numberOfPayments: 30,
      growthRate: 0.05,
    });
    assert.equal(schedule.length, 30);
    const total = schedule.reduce((sum, p) => sum + p.paymentAmount, 0);
    assert.ok(Math.abs(total - 500_000_000) < 0.01, `sum ${total} != 500,000,000`);
    // Real engine output: geometric series solved so the nominal total equals
    // the advertised value.
    assert.equal(schedule[0]?.paymentAmount, 7_525_717.54);
    assert.equal(schedule[29]?.paymentAmount, 30_976_873.83);
    assert.ok(
      (schedule[29]?.paymentAmount ?? 0) > (schedule[0]?.paymentAmount ?? 0),
      "payment 30 must exceed payment 1 at positive growth",
    );
    for (let i = 1; i < schedule.length; i++) {
      assert.ok(
        (schedule[i]?.paymentAmount ?? 0) >= (schedule[i - 1]?.paymentAmount ?? 0),
        `payments must grow monotonically (payment ${i + 1})`,
      );
    }
  });

  it("cumulative amounts end exactly at the advertised total", () => {
    const schedule = buildAnnuitySchedule({
      totalAdvertisedValue: 500_000_000,
      numberOfPayments: 30,
      growthRate: 0.05,
    });
    assert.equal(schedule[29]?.cumulativeAmount, 500_000_000);
  });

  it("rejects invalid inputs", () => {
    const zero = validateAnnuityScheduleInput({ totalAdvertisedValue: 0, numberOfPayments: 30 });
    assert.equal(zero.valid, false);
    assert.ok(zero.error, "zero total must produce an error message");

    const negativeGrowth = validateAnnuityScheduleInput({
      totalAdvertisedValue: 1_000_000,
      numberOfPayments: 30,
      growthRate: -0.01,
    });
    assert.equal(negativeGrowth.valid, false);

    const tooMuchGrowth = validateAnnuityScheduleInput({
      totalAdvertisedValue: 1_000_000,
      numberOfPayments: 30,
      growthRate: 1,
    });
    assert.equal(tooMuchGrowth.valid, false);

    // buildAnnuitySchedule returns [] for invalid input instead of throwing.
    assert.deepEqual(
      buildAnnuitySchedule({ totalAdvertisedValue: 0, numberOfPayments: 30 }),
      [],
    );
    assert.deepEqual(
      buildAnnuitySchedule({
        totalAdvertisedValue: 1_000_000,
        numberOfPayments: 30,
        growthRate: -0.01,
      }),
      [],
    );
  });
});
