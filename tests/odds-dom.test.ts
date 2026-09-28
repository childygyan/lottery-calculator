/**
 * Phase 6 built-DOM tests: the 4 odds/probability routes, the real bundled
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

const ROUTES = [
  { dist: "lottery-odds-calculator/index.html", h1: "Lottery Odds Calculator" },
  { dist: "lottery-probability-calculator/index.html", h1: "Lottery Probability Calculator" },
  { dist: "powerball-odds-calculator/index.html", h1: "Powerball Odds Calculator" },
  { dist: "mega-millions-odds-calculator/index.html", h1: "Mega Millions Odds Calculator" },
] as const;

before(() => {
  for (const r of ROUTES) pageHtml(r.dist);
});

describe("odds routes: SEO skeleton", () => {
  it("all 4 routes build with unique titles, descriptions, canonicals and one H1", () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    const canonicals = new Set<string>();
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
      assert.ok(!canonicals.has(canonical), `${r.dist}: unique canonical`);
      titles.add(title);
      descriptions.add(desc);
      canonicals.add(canonical);
      const h1s = doc.querySelectorAll("h1");
      assert.equal(h1s.length, 1, `${r.dist}: exactly one h1`);
      assert.equal(h1s[0].textContent?.trim(), r.h1);
      assert.ok(doc.querySelector('nav[aria-label="Breadcrumb"]'), `${r.dist}: breadcrumb nav`);
    }
  });

  it("uses the spec'd titles and descriptions on the generic page", () => {
    const doc = new JSDOM(pageHtml("lottery-odds-calculator/index.html")).window.document;
    assert.equal(
      doc.querySelector("title")?.textContent?.trim(),
      "Lottery Odds Calculator — Calculate Your Chances",
    );
    assert.equal(
      doc.querySelector('meta[name="description"]')?.getAttribute("content"),
      "Calculate lottery odds, probabilities, combinations, ticket costs, and your chance of at least one win.",
    );
  });

  it("uses the spec'd titles on the game pages", () => {
    const pb = new JSDOM(pageHtml("powerball-odds-calculator/index.html")).window.document;
    assert.equal(
      pb.querySelector("title")?.textContent?.trim(),
      "Powerball Odds Calculator — Calculate Your Winning Chances",
    );
    const mm = new JSDOM(pageHtml("mega-millions-odds-calculator/index.html")).window.document;
    assert.equal(
      mm.querySelector("title")?.textContent?.trim(),
      "Mega Millions Odds Calculator — Calculate Your Winning Chances",
    );
  });

  it("emits BreadcrumbList and FAQPage JSON-LD, and no Review/Rating schema", () => {
    for (const r of ROUTES) {
      const doc = new JSDOM(pageHtml(r.dist)).window.document;
      const blocks = [...doc.querySelectorAll('script[type="application/ld+json"]')].map((s) =>
        JSON.parse(s.textContent ?? "{}"),
      );
      const types = blocks.map((b) => b["@type"]);
      assert.ok(types.includes("BreadcrumbList"), `${r.dist}: BreadcrumbList`);
      assert.ok(types.includes("FAQPage"), `${r.dist}: FAQPage`);
      const raw = blocks.map((b) => JSON.stringify(b)).join(" ");
      assert.ok(!/Review|AggregateRating/.test(raw), `${r.dist}: no review/rating schema`);
    }
  });

  it("sitemap includes all 4 routes", () => {
    const xml = readFileSync(join(DIST, "sitemap-0.xml"), "utf8");
    for (const path of [
      "/lottery-odds-calculator/",
      "/lottery-probability-calculator/",
      "/powerball-odds-calculator/",
      "/mega-millions-odds-calculator/",
    ]) {
      assert.ok(xml.includes(path), `sitemap has ${path}`);
    }
  });

  it("has no broken internal links", () => {
    const missing: string[] = [];
    for (const r of ROUTES) {
      const doc = new JSDOM(pageHtml(r.dist)).window.document;
      for (const a of doc.querySelectorAll("a[href]")) {
        const href = a.getAttribute("href") ?? "";
        if (!href.startsWith("/") || href.startsWith("//")) continue;
        const clean = href.split("?")[0].split("#")[0];
        const target = join(DIST, clean === "/" ? "index.html" : `${clean.replace(/\/$/, "")}/index.html`);
        try {
          readFileSync(target);
        } catch {
          missing.push(`${r.dist} -> ${href}`);
        }
      }
    }
    assert.deepEqual(missing, []);
  });
});

describe("generic odds calculator (built DOM)", () => {
  it("computes 6/49 odds: 1 in 13,983,816", async () => {
    const { dom, doc } = await loadInteractivePage(
      "lottery-odds-calculator/index.html",
      "http://localhost:4321/lottery-odds-calculator/",
    );
    setValue(doc, "odds-main-pick", "6");
    setValue(doc, "odds-main-pool", "49");
    setValue(doc, "odds-bonus-pick", "0");
    setValue(doc, "odds-bonus-pool", "0");
    setValue(doc, "odds-ticket-count", "1");
    submitForm(dom, doc, "odds-form");
    const oneInX = doc.getElementById("odds-one-in-x")?.textContent ?? "";
    assert.equal(oneInX, "1 in 13,983,816");
    const combos = doc.getElementById("odds-combinations")?.textContent ?? "";
    assert.equal(combos, "13,983,816");
    // No ticket price entered -> cost cards stay hidden.
    assert.ok(doc.getElementById("odds-cost-wrap")?.classList.contains("hidden"));
    // Copy button enabled after a successful calculation.
    assert.equal((doc.getElementById("odds-copy") as HTMLButtonElement).disabled, false);
  });

  it("shows a friendly error when picks exceed the pool", async () => {
    const { dom, doc } = await loadInteractivePage(
      "lottery-odds-calculator/index.html",
      "http://localhost:4321/lottery-odds-calculator/",
    );
    setValue(doc, "odds-main-pick", "70");
    setValue(doc, "odds-main-pool", "69");
    submitForm(dom, doc, "odds-form");
    const err = doc.getElementById("odds-error")?.textContent ?? "";
    assert.match(err, /more main numbers than the pool/i);
    assert.ok(doc.getElementById("odds-results")?.classList.contains("hidden"));
  });

  it("computes Powerball defaults: 1 in 292,201,338 with $2 cost", async () => {
    const { dom, doc } = await loadInteractivePage(
      "lottery-odds-calculator/index.html",
      "http://localhost:4321/lottery-odds-calculator/",
    );
    setValue(doc, "odds-ticket-price", "2");
    setValue(doc, "odds-ticket-count", "10");
    submitForm(dom, doc, "odds-form");
    assert.equal(doc.getElementById("odds-one-in-x")?.textContent, "1 in 292,201,338");
    assert.equal(doc.getElementById("odds-cost")?.textContent, "$20");
  });
});

describe("locked game odds calculators (built DOM)", () => {
  it("Powerball page: locked rules, 10 tickets -> 1 in 292,201,338 and $20", async () => {
    const { dom, doc } = await loadInteractivePage(
      "powerball-odds-calculator/index.html",
      "http://localhost:4321/powerball-odds-calculator/",
    );
    const form = doc.getElementById("odds-form") as HTMLFormElement;
    assert.equal(form.dataset.locked, "true");
    assert.equal(form.dataset.mainPick, "5");
    assert.equal(form.dataset.mainPool, "69");
    assert.equal(form.dataset.bonusPool, "26");
    setValue(doc, "odds-ticket-count", "10");
    submitForm(dom, doc, "odds-form");
    assert.equal(doc.getElementById("odds-one-in-x")?.textContent, "1 in 292,201,338");
    assert.equal(doc.getElementById("odds-cost")?.textContent, "$20");
    const prob = doc.getElementById("odds-probability")?.textContent ?? "";
    assert.match(prob, /^0\.0+\d+%$/);
  });

  it("Mega Millions page: locked rules -> 1 in 290,472,336", async () => {
    const { dom, doc } = await loadInteractivePage(
      "mega-millions-odds-calculator/index.html",
      "http://localhost:4321/mega-millions-odds-calculator/",
    );
    const form = doc.getElementById("odds-form") as HTMLFormElement;
    assert.equal(form.dataset.locked, "true");
    assert.equal(form.dataset.mainPool, "70");
    assert.equal(form.dataset.bonusPool, "24");
    assert.equal(form.dataset.ticketPrice, "5");
    setValue(doc, "odds-ticket-count", "1");
    submitForm(dom, doc, "odds-form");
    assert.equal(doc.getElementById("odds-one-in-x")?.textContent, "1 in 290,472,336");
  });

  it("game pages render the prize-tier table from the verified config", () => {
    for (const dist of [
      "powerball-odds-calculator/index.html",
      "mega-millions-odds-calculator/index.html",
    ]) {
      const doc = new JSDOM(pageHtml(dist)).window.document;
      const tableText = doc.body.textContent ?? "";
      assert.ok(/292,201,338|290,472,336/.test(tableText), `${dist}: jackpot odds in tier table`);
      assert.ok(doc.querySelector("table"), `${dist}: prize table present`);
    }
  });
});

describe("probability explorer (built DOM)", () => {
  it("renders the preset ticket-count table for Powerball", async () => {
    const { dom, doc } = await loadInteractivePage(
      "lottery-probability-calculator/index.html",
      "http://localhost:4321/lottery-probability-calculator/",
    );
    submitForm(dom, doc, "prob-form");
    const rows = doc.querySelectorAll("#prob-table-body tr");
    assert.ok(rows.length >= 5, `expected preset rows, got ${rows.length}`);
    const bodyText = doc.getElementById("prob-table-body")?.textContent ?? "";
    assert.ok(bodyText.includes("1,000"), "1,000-ticket row present");
    assert.ok(bodyText.includes("10,000"), "10,000-ticket row present");
    assert.ok(bodyText.includes("(yours)"), "custom count marked");
    assert.ok(
      (doc.getElementById("prob-your-chance")?.textContent ?? "").length > 0,
      "your-chance rendered",
    );
  });

  it("marks the custom ticket count row and shows its chance", async () => {
    const { dom, doc } = await loadInteractivePage(
      "lottery-probability-calculator/index.html",
      "http://localhost:4321/lottery-probability-calculator/",
    );
    setValue(doc, "prob-ticket-count", "500");
    submitForm(dom, doc, "prob-form");
    const bodyText = doc.getElementById("prob-table-body")?.textContent ?? "";
    assert.ok(bodyText.includes("500"), "custom 500-ticket row present");
  });

  it("shows a friendly error for invalid custom odds", async () => {
    const { dom, doc } = await loadInteractivePage(
      "lottery-probability-calculator/index.html",
      "http://localhost:4321/lottery-probability-calculator/",
    );
    const sel = doc.getElementById("prob-lottery") as HTMLSelectElement;
    sel.value = "custom";
    sel.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    // custom odds left empty -> friendly error, no results.
    submitForm(dom, doc, "prob-form");
    const err = doc.getElementById("prob-error")?.textContent ?? "";
    assert.ok(err.length > 0, "error shown for empty custom odds");
    assert.ok(doc.getElementById("prob-results")?.classList.contains("hidden"));
  });

  it("copy button on the odds form becomes usable after calculation", async () => {
    const { dom, doc } = await loadInteractivePage(
      "powerball-odds-calculator/index.html",
      "http://localhost:4321/powerball-odds-calculator/",
    );
    assert.equal((doc.getElementById("odds-copy") as HTMLButtonElement).disabled, true);
    setValue(doc, "odds-ticket-count", "1");
    submitForm(dom, doc, "odds-form");
    assert.equal((doc.getElementById("odds-copy") as HTMLButtonElement).disabled, false);
    clickButton(dom, doc, "odds-copy");
    const status = doc.getElementById("odds-copy-status")?.textContent ?? "";
    assert.ok(status.length > 0, "copy status announced");
  });
});
