/**
 * DOM smoke tests: the REAL built HTML + the REAL bundled client script.
 * Requires `npm run build` first (run via `npm run test:dom`).
 *
 * These tests catch wiring bugs unit tests cannot: wrong element IDs,
 * broken event handlers, missing defaults, and accessibility attributes.
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runInContext } from "node:vm";
import { JSDOM } from "jsdom";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

let dom: JSDOM;

function freshDom(): JSDOM {
  const html = readFileSync(join(DIST, "lottery-calculator", "index.html"), "utf8");
  const d = new JSDOM(html, {
    url: "http://localhost:4321/lottery-calculator/",
    // Makes the window a real vm.Context for runInContext below.
    runScripts: "outside-only",
  });
  // Find the bundled calculator script and run it in the window context.
  const src = d.window.document
    .querySelector('script[type="module"][src]')
    ?.getAttribute("src");
  assert.ok(src, "calculator bundle script tag exists");
  const bundle = readFileSync(join(DIST, src.replace(/^\//, "")), "utf8");
  // Run the bundle inside the window's own VM context so it sees the real
  // DOM globals (document, HTMLElement, FormData, ...).
  runInContext(bundle, d.window, { filename: "calculator-bundle.js" });
  return d;
}

function setValue(doc: Document, id: string, value: string) {
  const el = doc.getElementById(id) as HTMLInputElement | HTMLSelectElement;
  el.value = value;
}

function submit(doc: Document) {
  const form = doc.getElementById("lottery-form") as HTMLFormElement;
  form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
}

before(() => {
  // Fail fast with a clear message if dist/ is stale or missing.
  try {
    readFileSync(join(DIST, "lottery-calculator", "index.html"), "utf8");
  } catch {
    throw new Error("dist/ missing — run `npm run build` before `npm run test:dom`.");
  }
});

describe("calculator form (built HTML)", () => {
  it("renders all inputs with correct defaults", () => {
    dom = freshDom();
    const doc = dom.window.document;
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

  it("valid lump-sum submit fills both result sections", () => {
    dom = freshDom();
    const doc = dom.window.document;
    setValue(doc, "jackpot", "100000000");
    setValue(doc, "cashValue", "48000000");
    setValue(doc, "state", "NY");
    submit(doc);

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

  it("shows the verification notice for West Virginia", () => {
    dom = freshDom();
    const doc = dom.window.document;
    setValue(doc, "jackpot", "1000000");
    setValue(doc, "cashValue", "480000");
    setValue(doc, "state", "WV");
    submit(doc);
    const notice = doc.getElementById("result-state-notice");
    assert.equal(notice?.hidden, false);
    assert.match(notice?.textContent ?? "", /verif/i);
  });

  it("annuity toggle hides cash field and estimates one annual payment", () => {
    dom = freshDom();
    const doc = dom.window.document;
    const annuity = doc.querySelector('input[name="payoutChoice"][value="annuity"]') as HTMLInputElement;
    annuity.checked = true;
    annuity.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    assert.equal((doc.getElementById("cash-field") as HTMLElement).style.display, "none");

    setValue(doc, "jackpot", "100000000");
    setValue(doc, "state", "TX");
    submit(doc);
    const text = (id: string) => doc.getElementById(id)?.textContent;
    assert.equal(text("result-payout-label"), "Annual Annuity Payment");
    assert.equal(text("result-payout"), "$3,333,333.33");
    assert.equal(text("result-state"), "$0.00");
  });

  it("empty jackpot shows an error, marks the field, and keeps results hidden", () => {
    dom = freshDom();
    const doc = dom.window.document;
    setValue(doc, "jackpot", "");
    setValue(doc, "cashValue", "48000000");
    setValue(doc, "state", "NY");
    submit(doc);
    const err = doc.getElementById("jackpot-error");
    assert.equal(err?.hidden, false);
    assert.equal(err?.textContent, "Jackpot amount is required.");
    assert.equal(doc.getElementById("jackpot")?.getAttribute("aria-invalid"), "true");
    assert.equal(doc.getElementById("lottery-results")?.hidden, true);
    // Focus moved to the invalid field.
    assert.equal(doc.activeElement?.id, "jackpot");
  });

  it("cash option above jackpot shows the friendly error", () => {
    dom = freshDom();
    const doc = dom.window.document;
    setValue(doc, "jackpot", "1000000");
    setValue(doc, "cashValue", "2000000");
    setValue(doc, "state", "NY");
    submit(doc);
    const err = doc.getElementById("cashValue-error");
    assert.equal(err?.hidden, false);
    assert.match(err?.textContent ?? "", /usually lower than the advertised jackpot/);
  });

  it("results region is announced to screen readers", () => {
    dom = freshDom();
    const doc = dom.window.document;
    assert.equal(doc.getElementById("lottery-results")?.getAttribute("aria-live"), "polite");
  });
});

describe("site chrome (built HTML)", () => {
  it("mobile menu toggles aria-expanded", () => {
    const html = readFileSync(join(DIST, "index.html"), "utf8");
    const d = new JSDOM(html, { url: "http://localhost:4321/" });
    const doc = d.window.document;
    const button = doc.querySelector("[aria-expanded]");
    assert.ok(button, "menu button with aria-expanded exists");
    assert.equal(button.getAttribute("aria-expanded"), "false");
  });

  it("no localhost or placeholder leaks in built pages", () => {
    const pages = ["index.html", "lottery-calculator/index.html", "about/index.html"];
    for (const p of pages) {
      const html = readFileSync(join(DIST, p), "utf8");
      assert.ok(!html.includes("localhost"), `${p}: no localhost`);
      assert.ok(!html.includes("127.0.0.1"), `${p}: no 127.0.0.1`);
    }
  });
});

describe("state pages (built HTML)", () => {
  function stateHtml(slug: string): string {
    return readFileSync(join(DIST, "lottery-tax-calculator", slug, "index.html"), "utf8");
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
    const html = readFileSync(join(DIST, "lottery-tax-calculator", "index.html"), "utf8");
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
