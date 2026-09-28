/**
 * Phase 5 built-DOM tests: the 8 payout/annuity routes, the real bundled
 * client scripts, and the real calculator wiring. Requires `npm run build`.
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadInteractivePage,
  pageHtml,
  setValue,
  submitForm,
  clickButton,
  DIST,
} from "./dom-utils.ts";

const HUB = "lottery-payout-calculator/index.html";
const HUB_URL = "http://localhost:4321/lottery-payout-calculator/";

const ROUTES = [
  { dist: "lottery-payout-calculator/index.html", h1: "Lottery Payout Calculator" },
  { dist: "lottery-annuity-calculator/index.html", h1: "Lottery Annuity Calculator" },
  { dist: "lottery-cash-option-calculator/index.html", h1: "Lottery Cash Option Calculator" },
  { dist: "lottery-payout-calculator/1-million/index.html", h1Match: /\$1 Million/ },
  { dist: "lottery-payout-calculator/10-million/index.html", h1Match: /\$10 Million/ },
  { dist: "lottery-payout-calculator/100-million/index.html", h1Match: /\$100 Million/ },
  { dist: "lottery-payout-calculator/500-million/index.html", h1Match: /\$500 Million/ },
  { dist: "lottery-payout-calculator/1-billion/index.html", h1Match: /\$1 Billion/ },
] as const;

before(() => {
  for (const r of ROUTES) pageHtml(r.dist);
});

describe("payout routes: SEO skeleton", () => {
  it("all 8 routes build with unique titles, descriptions, canonicals and one H1", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const r of ROUTES) {
      const doc = new JSDOM(pageHtml(r.dist)).window.document;
      const title = doc.querySelector("title")?.textContent?.trim() ?? "";
      const desc = doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
      const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
      assert.ok(title.length > 10, `${r.dist}: title`);
      assert.ok(desc.length > 20, `${r.dist}: meta description`);
      assert.ok(canonical.length > 0, `${r.dist}: canonical`);
      assert.ok(!titles.has(title), `${r.dist}: unique title`);
      assert.ok(!descriptions.has(desc), `${r.dist}: unique description`);
      titles.add(title);
      descriptions.add(desc);
      const h1s = doc.querySelectorAll("h1");
      assert.equal(h1s.length, 1, `${r.dist}: exactly one h1`);
      if ("h1" in r) assert.equal(h1s[0].textContent?.trim(), r.h1);
      else assert.match(h1s[0].textContent ?? "", r.h1Match, `${r.dist}: h1 mentions amount`);
      assert.ok(doc.querySelector('nav[aria-label="Breadcrumb"]'), `${r.dist}: breadcrumb nav`);
    }
  });

  it("routes carry BreadcrumbList JSON-LD and amount pages carry FAQ JSON-LD", () => {
    for (const r of ROUTES) {
      const doc = new JSDOM(pageHtml(r.dist)).window.document;
      const scripts = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(
        (s) => s.textContent ?? "",
      );
      assert.ok(scripts.some((s) => s.includes("BreadcrumbList")), `${r.dist}: BreadcrumbList`);
      if (r.dist.includes("lottery-payout-calculator/") && r.dist !== HUB) {
        assert.ok(scripts.some((s) => s.includes("FAQPage")), `${r.dist}: FAQPage`);
      }
    }
  });

  it("sitemap lists all 8 routes", () => {
    const sitemap = readFileSync(join(DIST, "sitemap-0.xml"), "utf8");
    const paths = [
      "/lottery-payout-calculator/",
      "/lottery-annuity-calculator/",
      "/lottery-cash-option-calculator/",
      "/lottery-payout-calculator/1-million/",
      "/lottery-payout-calculator/10-million/",
      "/lottery-payout-calculator/100-million/",
      "/lottery-payout-calculator/500-million/",
      "/lottery-payout-calculator/1-billion/",
    ];
    for (const p of paths) assert.ok(sitemap.includes(p), `sitemap contains ${p}`);
  });
});

describe("payout hub calculator (built HTML)", () => {
  it("renders fields, cash hint, game selector and presets", async () => {
    const { doc } = await loadInteractivePage(HUB, HUB_URL);
    for (const id of [
      "payout-jackpot",
      "payout-cashValue",
      "payout-years",
      "payout-increase",
      "payout-game",
      "payout-state",
      "payout-taxYear",
      "payout-filingStatus",
      "payout-form",
      "payout-results",
    ]) {
      assert.ok(doc.getElementById(id), `#${id} exists`);
    }
    assert.ok(
      doc.body.textContent?.includes("Enter the current cash value to calculate an estimate."),
      "required cash-value hint present",
    );
    assert.ok(doc.querySelectorAll("[data-preset]").length >= 5, "quick presets present");
    assert.equal(doc.getElementById("payout-results")?.hidden, true, "results hidden initially");
  });

  it("prefills the jackpot from a valid ?amount= parameter", async () => {
    const { doc } = await loadInteractivePage(HUB, `${HUB_URL}?amount=1000000`);
    assert.equal(
      (doc.getElementById("payout-jackpot") as HTMLInputElement).value,
      "1,000,000",
      "?amount=1000000 prefills the jackpot field",
    );
  });

  it("ignores an invalid ?amount= parameter", async () => {
    const { doc } = await loadInteractivePage(HUB, `${HUB_URL}?amount=abc`);
    assert.equal(
      (doc.getElementById("payout-jackpot") as HTMLInputElement).value,
      "",
      "invalid ?amount= leaves the field empty",
    );
  });

  it("custom comparison renders cash vs annuity, 5 schedule rows, and expands to all 30", async () => {
    const { dom, doc } = await loadInteractivePage(HUB, HUB_URL);
    setValue(doc, "payout-jackpot", "100000000");
    setValue(doc, "payout-cashValue", "48000000");
    setValue(doc, "payout-state", "TX");
    submitForm(dom, doc, "payout-form");

    assert.equal(doc.getElementById("payout-results")?.hidden, false, "results shown");
    const comparison = doc.getElementById("payout-comparison")?.textContent ?? "";
    assert.ok(comparison.includes("Cash option"), "comparison shows cash option");
    assert.ok(comparison.includes("Annuity"), "comparison shows annuity");
    assert.ok(!/better/i.test(comparison), "comparison never ranks the options");

    const schedule = doc.getElementById("payout-schedule");
    assert.ok(schedule, "schedule section exists");
    const firstTbody = schedule.querySelector("tbody");
    assert.equal(firstTbody?.querySelectorAll("tr").length, 5, "5 payments visible initially");
    const toggle = doc.getElementById("payout-schedule-toggle");
    assert.ok(toggle, "expand toggle exists");
    assert.equal(toggle.getAttribute("aria-expanded"), "false");
    clickButton(dom, doc, "payout-schedule-toggle");
    const rows = schedule.querySelectorAll("tbody tr").length;
    assert.equal(rows, 30, "all 30 payments visible after expanding");
    assert.equal(toggle.getAttribute("aria-expanded"), "true");

    const assumptions = doc.getElementById("payout-assumptions");
    assert.ok((assumptions?.querySelectorAll("li").length ?? 0) >= 2, "assumptions listed");
    // Withholding is presented separately from final liability.
    assert.ok(
      doc.body.textContent?.includes("withholding") &&
        doc.body.textContent?.toLowerCase().includes("final tax"),
      "withholding separated from final liability",
    );
  });

  it("copy button copies the comparison text including the advertised jackpot", async () => {
    const { dom, doc } = await loadInteractivePage(HUB, HUB_URL);
    let captured = "";
    (dom.window.navigator as unknown as { clipboard: unknown }).clipboard = {
      writeText: async (t: string) => {
        captured = t;
      },
    };
    setValue(doc, "payout-jackpot", "100000000");
    setValue(doc, "payout-cashValue", "48000000");
    setValue(doc, "payout-state", "TX");
    submitForm(dom, doc, "payout-form");
    clickButton(dom, doc, "payout-copy");
    // Flush the async clipboard promise.
    await new Promise((r) => setTimeout(r, 20));
    assert.ok(captured.includes("Advertised jackpot: $100,000,000.00"), "copy text has advertised jackpot");
    assert.ok(captured.includes("Cash option: $48,000,000.00"), "copy text has cash option");
    assert.equal(doc.getElementById("payout-copy-note")?.hidden, false, "copied note shown");
  });

  it("Mega Millions locks 30 payments and 5% growth, submit uses the real structure", async () => {
    const { dom, doc } = await loadInteractivePage(HUB, HUB_URL);
    const game = doc.getElementById("payout-game") as HTMLSelectElement;
    game.value = "mega-millions";
    game.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    const years = doc.getElementById("payout-years") as HTMLInputElement;
    const increase = doc.getElementById("payout-increase") as HTMLInputElement;
    assert.equal(years.value, "30");
    assert.equal(increase.value, "5");
    assert.ok(years.readOnly, "years locked for Mega Millions");
    assert.ok(increase.readOnly, "growth locked for Mega Millions");

    setValue(doc, "payout-jackpot", "100000000");
    setValue(doc, "payout-cashValue", "48000000");
    setValue(doc, "payout-state", "TX");
    submitForm(dom, doc, "payout-form");
    assert.equal(doc.getElementById("payout-results")?.hidden, false, "results shown for Mega Millions");
    const comparisonText = doc.getElementById("payout-comparison")?.textContent ?? "";
    assert.match(comparisonText, /5\.00%/, "comparison shows the 5% graduation");
  });

  it("Powerball keeps growth editable and warns that no rate is published", async () => {
    const { dom, doc } = await loadInteractivePage(HUB, HUB_URL);
    const game = doc.getElementById("payout-game") as HTMLSelectElement;
    game.value = "powerball";
    game.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    const years = doc.getElementById("payout-years") as HTMLInputElement;
    const increase = doc.getElementById("payout-increase") as HTMLInputElement;
    assert.equal(years.value, "30");
    assert.ok(years.readOnly, "years locked for Powerball");
    assert.ok(!increase.readOnly, "growth stays editable for Powerball");
    const hint = doc.getElementById("payout-game-hint")?.textContent ?? "";
    assert.match(hint, /no fixed graduation rate/i, "Powerball hint states the unknown rate");
  });
});

describe("cash-option calculator (built HTML)", () => {
  const CASH = "lottery-cash-option-calculator/index.html";
  const CASH_URL = "http://localhost:4321/lottery-cash-option-calculator/";

  it("is cash-only: no annuity fields, but jackpot + cash + taxes", async () => {
    const { dom, doc } = await loadInteractivePage(CASH, CASH_URL);
    assert.ok(doc.getElementById("cashopt-jackpot"), "jackpot field");
    assert.ok(doc.getElementById("cashopt-cashValue"), "cash field");
    assert.ok(!doc.getElementById("cashopt-years"), "no annuity years field");
    assert.ok(!doc.getElementById("cashopt-increase"), "no annuity growth field");
    assert.ok(!doc.getElementById("cashopt-game"), "no game selector");
    assert.ok(
      doc.body.textContent?.includes("Enter the current cash value to calculate an estimate."),
      "cash hint present",
    );

    setValue(doc, "cashopt-jackpot", "50000000");
    setValue(doc, "cashopt-cashValue", "24000000");
    setValue(doc, "cashopt-state", "CA");
    submitForm(dom, doc, "cashopt-form");
    assert.equal(doc.getElementById("cashopt-results")?.hidden, false, "results shown");
    const body = doc.getElementById("cashopt-results")?.textContent ?? "";
    assert.ok(body.includes("Advertised Jackpot"), "advertised jackpot row present");
    assert.ok(body.includes("Cash option"), "cash option row present");
    assert.ok(!body.includes("Annuity"), "no annuity section in cash-only results");
  });
});

describe("annuity scheduler (built HTML)", () => {
  const PAGE_PATH = "lottery-annuity-calculator/index.html";
  const PAGE_URL = "http://localhost:4321/lottery-annuity-calculator/";

  it("builds a monthly schedule and rejects invalid input", async () => {
    const { dom, doc } = await loadInteractivePage(PAGE_PATH, PAGE_URL);
    setValue(doc, "annuity-total", "120000000");
    setValue(doc, "annuity-payments", "12");
    setValue(doc, "annuity-increase", "0");
    (doc.getElementById("annuity-frequency") as HTMLSelectElement).value = "monthly";
    submitForm(dom, doc, "annuity-form");
    const results = doc.getElementById("annuity-results");
    assert.equal(results?.hidden, false, "results shown");
    assert.equal(results?.querySelectorAll("tbody tr").length, 12, "12 monthly payments rendered");
    assert.match(results?.textContent ?? "", /monthly/i, "frequency labeled");

    // Invalid: zero payments.
    setValue(doc, "annuity-payments", "0");
    submitForm(dom, doc, "annuity-form");
    const err = doc.getElementById("annuity-payments-error");
    assert.equal(err?.hidden, false, "error shown for zero payments");
    assert.equal(doc.getElementById("annuity-results")?.hidden, true, "results hidden on error");
  });
});

describe("amount pages (built HTML)", () => {
  it("$100M page prefills its jackpot and shows a real worked example", async () => {
    const { doc } = await loadInteractivePage(
      "lottery-payout-calculator/100-million/index.html",
      "http://localhost:4321/lottery-payout-calculator/100-million/",
    );
    assert.equal(
      (doc.getElementById("payout-100-million-jackpot") as HTMLInputElement).value,
      "100,000,000",
      "jackpot prefilled with the page amount",
    );
    // The worked example is computed at build time with the real engine.
    const example = doc.querySelector('section[aria-label="Worked example with real calculations"]');
    assert.ok(example, "worked example section exists");
    assert.match(example?.textContent ?? "", /\$3,333,333/, "example shows a real first payment");
  });

  it("hub links all five amount pages plus annuity and cash-option calculators", () => {
    const doc = new JSDOM(pageHtml(HUB)).window.document;
    const hrefs = [...doc.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");
    for (const slug of ["1-million", "10-million", "100-million", "500-million", "1-billion"]) {
      assert.ok(hrefs.includes(`/lottery-payout-calculator/${slug}/`), `hub links ${slug}`);
    }
    assert.ok(hrefs.includes("/lottery-annuity-calculator/"), "hub links annuity calculator");
    assert.ok(hrefs.includes("/lottery-cash-option-calculator/"), "hub links cash-option calculator");
  });
});
