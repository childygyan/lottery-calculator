/**
 * DOM smoke tests: the REAL built HTML + the REAL bundled client script.
 * Requires `npm run build` first (run via `npm run test:dom`).
 *
 * These tests catch wiring bugs unit tests cannot: wrong element IDs,
 * broken event handlers, missing defaults, and accessibility attributes.
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  loadInteractivePage,
  pageHtml,
  setValue,
  submitForm,
  DIST,
} from "./dom-utils.ts";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const PAGE = "lottery-calculator/index.html";
const URL = "http://localhost:4321/lottery-calculator/";

before(() => {
  // Fail fast with a clear message if dist/ is stale or missing.
  pageHtml(PAGE);
});

describe("calculator form (built HTML)", () => {
  it("renders all inputs with correct defaults", async () => {
    const { doc } = await loadInteractivePage(PAGE, URL);
    assert.ok(doc.getElementById("jackpot"), "jackpot input");
    assert.ok(doc.getElementById("cashValue"), "cash input");
    assert.ok(doc.getElementById("taxYear"), "tax year select");
    assert.ok(doc.getElementById("filingStatus"), "filing status select");
    assert.ok(doc.getElementById("state"), "state select");
    assert.equal((doc.getElementById("taxYear") as HTMLSelectElement).value, "2026");
    assert.equal((doc.getElementById("filingStatus") as HTMLSelectElement).value, "single");
    const lump = doc.querySelector('input[name="payoutChoice"][value="lump_sum"]') as HTMLInputElement;
    assert.equal(lump.checked, true);
    const states = [...doc.querySelectorAll("#state option")].filter(
      (o) => (o as HTMLOptionElement).value !== "",
    );
    assert.equal(states.length, 51, "50 states + DC");
    assert.equal(doc.getElementById("lottery-results")?.hidden, true, "results hidden initially");
  });

  it("valid lump-sum submit fills both result sections", async () => {
    const { dom, doc } = await loadInteractivePage(PAGE, URL);
    setValue(doc, "jackpot", "100000000");
    setValue(doc, "cashValue", "48000000");
    setValue(doc, "state", "NY");
    submitForm(dom, doc, "lottery-form");

    assert.equal(doc.getElementById("lottery-results")?.hidden, false);
    const text = (id: string) => doc.getElementById(id)?.textContent;
    assert.equal(text("result-jackpot"), "$100,000,000.00");
    assert.equal(text("result-payout-label"), "Cash Value");
    assert.equal(text("result-payout"), "$48,000,000.00");
    assert.equal(text("result-federal"), "$17,710,000.25");
    assert.equal(text("result-state"), "$5,232,000.00");
    assert.equal(text("result-total"), "$22,942,000.25");
    assert.equal(text("result-takehome"), "$25,057,999.75");
    // Tax Details section: withholding is separate from liability.
    assert.equal(text("detail-fed-withholding"), "$11,520,000.00");
    assert.equal(text("detail-state-withholding"), "Varies");
    assert.equal(text("detail-liability"), "$22,942,000.25");
    assert.equal(text("detail-rate"), "47.80%");
    // Meta line + no verification notice for a verified state.
    assert.match(text("result-meta") ?? "", /2026.*Single.*New York.*Lump sum/);
    assert.equal(doc.getElementById("result-state-notice")?.hidden, true);
  });

  it("shows the verification notice for West Virginia", async () => {
    const { dom, doc } = await loadInteractivePage(PAGE, URL);
    setValue(doc, "jackpot", "1000000");
    setValue(doc, "cashValue", "480000");
    setValue(doc, "state", "WV");
    submitForm(dom, doc, "lottery-form");
    const notice = doc.getElementById("result-state-notice");
    assert.equal(notice?.hidden, false);
    assert.match(notice?.textContent ?? "", /verif/i);
  });

  it("annuity toggle hides cash field and estimates one annual payment", async () => {
    const { dom, doc } = await loadInteractivePage(PAGE, URL);
    const annuity = doc.querySelector('input[name="payoutChoice"][value="annuity"]') as HTMLInputElement;
    annuity.checked = true;
    annuity.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    assert.equal((doc.getElementById("cash-field") as HTMLElement).style.display, "none");

    setValue(doc, "jackpot", "100000000");
    setValue(doc, "state", "TX");
    submitForm(dom, doc, "lottery-form");
    const text = (id: string) => doc.getElementById(id)?.textContent;
    assert.equal(text("result-payout-label"), "Annual Annuity Payment");
    assert.equal(text("result-payout"), "$3,333,333.33");
    assert.equal(text("result-state"), "$0.00");
  });

  it("empty jackpot shows an error, marks the field, and keeps results hidden", async () => {
    const { dom, doc } = await loadInteractivePage(PAGE, URL);
    setValue(doc, "jackpot", "");
    setValue(doc, "cashValue", "48000000");
    setValue(doc, "state", "NY");
    submitForm(dom, doc, "lottery-form");
    const err = doc.getElementById("jackpot-error");
    assert.equal(err?.hidden, false);
    assert.equal(err?.textContent, "Jackpot amount is required.");
    assert.equal(doc.getElementById("jackpot")?.getAttribute("aria-invalid"), "true");
    assert.equal(doc.getElementById("lottery-results")?.hidden, true);
    // Focus moved to the invalid field.
    assert.equal(doc.activeElement?.id, "jackpot");
  });

  it("cash option above jackpot shows the friendly error", async () => {
    const { dom, doc } = await loadInteractivePage(PAGE, URL);
    setValue(doc, "jackpot", "1000000");
    setValue(doc, "cashValue", "2000000");
    setValue(doc, "state", "NY");
    submitForm(dom, doc, "lottery-form");
    const err = doc.getElementById("cashValue-error");
    assert.equal(err?.hidden, false);
    assert.match(err?.textContent ?? "", /usually lower than the advertised jackpot/);
  });

  it("results region is announced to screen readers", async () => {
    const { doc } = await loadInteractivePage(PAGE, URL);
    assert.equal(doc.getElementById("lottery-results")?.getAttribute("aria-live"), "polite");
  });
});

describe("site chrome (built HTML)", () => {
  it("mobile menu toggles aria-expanded", () => {
    const html = pageHtml("index.html");
    const d = new JSDOM(html, { url: "http://localhost:4321/" });
    const doc = d.window.document;
    const button = doc.querySelector("[aria-expanded]");
    assert.ok(button, "menu button with aria-expanded exists");
    assert.equal(button.getAttribute("aria-expanded"), "false");
  });

  it("no localhost or placeholder leaks in built pages", () => {
    const pages = ["index.html", "lottery-calculator/index.html", "about/index.html"];
    for (const p of pages) {
      const html = pageHtml(p);
      assert.ok(!html.includes("localhost"), `${p}: no localhost`);
      assert.ok(!html.includes("127.0.0.1"), `${p}: no 127.0.0.1`);
    }
  });
});

describe("state pages (built HTML)", () => {
  function stateHtml(slug: string): string {
    return pageHtml(join("lottery-tax-calculator", slug, "index.html"));
  }

  it("preselects the page's state in the calculator and keeps all 51 options", () => {
    for (const [slug, code] of [["california", "CA"], ["texas", "TX"], ["new-york", "NY"]] as const) {
      const html = stateHtml(slug);
      const doc = new JSDOM(html).window.document;
      const options = [...doc.querySelectorAll("select#state option")];
      assert.equal(options.length, 52, `${slug}: 51 states + placeholder option`);
      const selected = options.filter((o) => o.hasAttribute("selected"));
      assert.equal(selected.length, 1, `${slug}: exactly one preselected option`);
      assert.equal(selected[0].getAttribute("value"), code, `${slug}: preselects ${code}`);
    }
  });

  it("West Virginia shows unavailable instead of a fabricated state tax", () => {
    const html = stateHtml("west-virginia");
    assert.ok(
      html.includes("Calculation unavailable with current verified data."),
      "WV page shows the unavailable notice",
    );
    assert.ok(
      html.includes("State-specific tax information is currently marked for verification."),
      "WV page shows the verification notice",
    );
  });

  it("hub has a working filter and links all 51 state pages", () => {
    const html = pageHtml(join("lottery-tax-calculator", "index.html"));
    const doc = new JSDOM(html).window.document;
    assert.ok(doc.getElementById("state-filter"), "filter input exists");
    const items = doc.querySelectorAll("#state-directory > li");
    assert.equal(items.length, 51, "directory lists 51 states");
    for (const item of items) {
      assert.ok(item.getAttribute("data-name"), "directory item has data-name");
      assert.ok(item.querySelector('a[href^="/lottery-tax-calculator/"]'), "directory item links to a state page");
    }
  });
});

describe("lottery game pages (built HTML)", () => {
  const pages = [
    { slug: "powerball-calculator", h1: "Powerball Calculator", game: "Powerball" },
    { slug: "mega-millions-calculator", h1: "Mega Millions Calculator", game: "Mega Millions" },
    { slug: "powerball-tax-calculator", h1: "Powerball Tax Calculator", game: "Powerball" },
    { slug: "mega-millions-tax-calculator", h1: "Mega Millions Tax Calculator", game: "Mega Millions" },
  ] as const;

  function gameDoc(slug: string): Document {
    return new JSDOM(pageHtml(join(slug, "index.html"))).window.document;
  }

  it("all four pages build with the correct H1", () => {
    for (const page of pages) {
      const doc = gameDoc(page.slug);
      const h1 = doc.querySelector("h1");
      assert.ok(h1, `${page.slug}: has an h1`);
      assert.equal(h1.textContent?.trim(), page.h1, `${page.slug}: h1 text`);
    }
  });

  it("each page embeds the working calculator form", () => {
    for (const page of pages) {
      const doc = gameDoc(page.slug);
      assert.ok(doc.getElementById("lottery-form"), `${page.slug}: calculator form present`);
      assert.ok(doc.getElementById("lottery-results"), `${page.slug}: results region present`);
    }
  });

  it("game pages render verified prize tiers and odds from the config", () => {
    const pb = gameDoc("powerball-calculator");
    assert.ok(pb.body.textContent?.includes("1 in 292,201,338"), "Powerball jackpot odds shown");
    assert.ok(pb.body.textContent?.includes("$1,000,000"), "Powerball Match 5 prize shown");

    const mm = gameDoc("mega-millions-calculator");
    assert.ok(mm.body.textContent?.includes("1 in 290,472,336"), "Mega Millions jackpot odds shown");
    assert.ok(mm.body.textContent?.includes("$10,000,000"), "Mega Millions 10X Match 5 prize shown");
  });

  it("pages carry breadcrumb + FAQ structured data", () => {
    for (const page of pages) {
      const doc = gameDoc(page.slug);
      const scripts = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(
        (s) => s.textContent ?? "",
      );
      assert.ok(scripts.some((s) => s.includes("BreadcrumbList")), `${page.slug}: BreadcrumbList JSON-LD`);
      assert.ok(scripts.some((s) => s.includes("FAQPage")), `${page.slug}: FAQPage JSON-LD`);
    }
  });

  it("pages link to their sibling calculators, never to unbuilt routes", () => {
    const pb = gameDoc("powerball-calculator");
    const pbHrefs = [...pb.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");
    assert.ok(pbHrefs.includes("/powerball-tax-calculator/"), "Powerball page links to its tax page");
    assert.ok(pbHrefs.includes("/mega-millions-calculator/"), "Powerball page links to Mega Millions");
    // /lottery-payout-calculator/ exists (Phase 5); /lottery-odds-calculator/ now exists (Phase 6).
    assert.ok(pbHrefs.includes("/lottery-payout-calculator/"), "footer links to the live payout calculator");
    assert.ok(pbHrefs.includes("/powerball-odds-calculator/"), "Powerball page links to its odds page");
  });

  it("cash field hint tells users to enter the official cash value", () => {
    const doc = gameDoc("powerball-calculator");
    assert.ok(
      doc.body.textContent?.includes("Enter the current cash value to calculate an estimate."),
      "lottery pages show the no-invention cash hint",
    );
  });

  it("game switcher lists the other calculators", () => {
    const doc = gameDoc("mega-millions-calculator");
    const nav = doc.querySelector('nav[aria-label="Other lottery calculators"]');
    assert.ok(nav, "switcher nav exists");
    const labels = [...nav.querySelectorAll("a")].map((a) => a.textContent ?? "");
    assert.ok(labels.some((t) => t.includes("Powerball Calculator")), "switcher links Powerball");
    assert.ok(labels.some((t) => t.includes("Lottery Tax Calculator")), "switcher links Lottery Tax");
  });
});

describe("client bundle size (built output)", () => {
  it("total client JavaScript stays lean", () => {
    const files = readdirSync(join(DIST, "_astro")).filter((f) => f.endsWith(".js"));
    let total = 0;
    for (const f of files) total += statSync(join(DIST, "_astro", f)).size;
    assert.ok(total < 120_000, `client JS total ${total} bytes stays under 120KB`);
  });
});
