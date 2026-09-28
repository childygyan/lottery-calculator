/**
 * Phase 7 built-DOM tests: the 4 generator routes, the real bundled client
 * scripts, and the real generator wiring. Requires `npm run build`.
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

const DISCLAIMER =
  "These numbers are randomly generated for entertainment and convenience. Randomly generated numbers do not improve the mathematical odds of winning and cannot predict future winning numbers.";

const ROUTES = [
  { dist: "lottery-number-generator/index.html", h1: "Lottery Number Generator" },
  { dist: "powerball-number-generator/index.html", h1: "Powerball Number Generator" },
  { dist: "mega-millions-number-generator/index.html", h1: "Mega Millions Number Generator" },
  { dist: "lottery-combination-generator/index.html", h1: "Lottery Combination Generator" },
] as const;

before(() => {
  for (const r of ROUTES) pageHtml(r.dist);
});

describe("generator routes: SEO skeleton", () => {
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
      "/lottery-number-generator/",
      "/powerball-number-generator/",
      "/mega-millions-number-generator/",
      "/lottery-combination-generator/",
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

  it("carries the required disclaimer and makes no prediction/luck claims", () => {
    for (const dist of [
      "lottery-number-generator/index.html",
      "powerball-number-generator/index.html",
      "mega-millions-number-generator/index.html",
    ]) {
      const text = new JSDOM(pageHtml(dist)).window.document.body.textContent ?? "";
      assert.ok(text.includes(DISCLAIMER), `${dist}: required disclaimer`);
      // "no hot or cold numbers" / "your lucky numbers" are denials; strip them.
      const claims = text
        .replace(/no hot or cold numbers/gi, "")
        .replace(/your lucky numbers/gi, "");
      assert.ok(!/lucky numbers/i.test(claims), `${dist}: no lucky-numbers claim`);
      assert.ok(!/hot numbers|cold numbers/i.test(claims), `${dist}: no hot/cold-number claims`);
      assert.ok(!/due numbers/i.test(claims), `${dist}: no due-number claims`);
      assert.ok(
        !/improve (your|the) (odds|chances)/i.test(text.replace(/do not improve/i, "")),
        `${dist}: no odds-improvement claim`,
      );
    }
  });
});

describe("generic number generator (built DOM)", () => {
  it("generates 5 sorted, in-range, unique 6/49 sets", async () => {
    const { dom, doc } = await loadInteractivePage(
      "lottery-number-generator/index.html",
      "http://localhost:4321/lottery-number-generator/",
    );
    setValue(doc, "gen-main-pick", "6");
    setValue(doc, "gen-main-pool", "49");
    setValue(doc, "gen-bonus-pick", "0");
    setValue(doc, "gen-qty", "5");
    submitForm(dom, doc, "gen-form");
    const items = doc.querySelectorAll("#gen-list li");
    assert.equal(items.length, 5);
    const seen = new Set<string>();
    for (const li of items) {
      const label = li.getAttribute("aria-label") ?? "";
      const nums = [...label.matchAll(/\d+/g)].map((m) => Number(m[0]));
      assert.equal(nums.length, 6);
      assert.deepEqual([...nums].sort((a, b) => a - b), nums, "sorted ascending");
      for (const n of nums) assert.ok(n >= 1 && n <= 49, `in range: ${n}`);
      assert.equal(new Set(nums).size, 6, "no duplicates within set");
      seen.add(nums.join(","));
    }
    assert.equal(seen.size, 5, "no duplicate sets");
    assert.equal(
      doc.getElementById("gen-status")?.textContent,
      "5 new lottery number sets generated.",
    );
  });

  it("shows a friendly error for an out-of-range quantity", async () => {
    const { dom, doc } = await loadInteractivePage(
      "lottery-number-generator/index.html",
      "http://localhost:4321/lottery-number-generator/",
    );
    setValue(doc, "gen-qty", "101");
    submitForm(dom, doc, "gen-form");
    const err = doc.getElementById("gen-error")?.textContent ?? "";
    assert.match(err, /between 1 and 100/);
    assert.ok(doc.getElementById("gen-results")?.classList.contains("hidden"));
  });

  it("rejects more unique sets than mathematically possible", async () => {
    const { dom, doc } = await loadInteractivePage(
      "lottery-number-generator/index.html",
      "http://localhost:4321/lottery-number-generator/",
    );
    setValue(doc, "gen-main-pick", "1");
    setValue(doc, "gen-main-pool", "3");
    setValue(doc, "gen-bonus-pick", "0");
    setValue(doc, "gen-qty", "10");
    submitForm(dom, doc, "gen-form");
    assert.equal(
      doc.getElementById("gen-error")?.textContent,
      "Please choose a smaller number of combinations.",
    );
  });

  it("enables copy/print after generation and announces copy status", async () => {
    const { dom, doc } = await loadInteractivePage(
      "lottery-number-generator/index.html",
      "http://localhost:4321/lottery-number-generator/",
    );
    assert.equal((doc.getElementById("gen-copy") as HTMLButtonElement).disabled, true);
    setValue(doc, "gen-qty", "1");
    submitForm(dom, doc, "gen-form");
    assert.equal((doc.getElementById("gen-copy") as HTMLButtonElement).disabled, false);
    assert.equal((doc.getElementById("gen-print") as HTMLButtonElement).disabled, false);
    clickButton(dom, doc, "gen-copy");
    await new Promise((r) => setTimeout(r, 50));
    const status = doc.getElementById("gen-copy-status")?.textContent ?? "";
    assert.ok(status.length > 0, "copy status announced");
  });

  it("keeps a session-only history capped at 20 sets", async () => {
    const { dom, doc } = await loadInteractivePage(
      "lottery-number-generator/index.html",
      "http://localhost:4321/lottery-number-generator/",
    );
    setValue(doc, "gen-qty", "10");
    submitForm(dom, doc, "gen-form");
    submitForm(dom, doc, "gen-form");
    submitForm(dom, doc, "gen-form");
    const entries = doc.querySelectorAll("#gen-history li");
    assert.equal(entries.length, 20, "history capped at 20");
    assert.ok(!doc.getElementById("gen-history-wrap")?.classList.contains("hidden"));
    clickButton(dom, doc, "gen-history-clear");
    assert.equal(doc.querySelectorAll("#gen-history li").length, 0);
  });
});

describe("locked game generators (built DOM)", () => {
  it("Powerball page: locked config, sets have 5 white balls + Powerball", async () => {
    const { dom, doc } = await loadInteractivePage(
      "powerball-number-generator/index.html",
      "http://localhost:4321/powerball-number-generator/",
    );
    const form = doc.getElementById("gen-form") as HTMLFormElement;
    assert.equal(form.dataset.locked, "true");
    assert.equal(form.dataset.mainPick, "5");
    assert.equal(form.dataset.mainPool, "69");
    assert.equal(form.dataset.bonusPool, "26");
    setValue(doc, "gen-qty", "3");
    submitForm(dom, doc, "gen-form");
    const items = doc.querySelectorAll("#gen-list li");
    assert.equal(items.length, 3);
    for (const li of items) {
      const label = li.getAttribute("aria-label") ?? "";
      const digits = [...label.matchAll(/\d+/g)].map((m) => Number(m[0]));
      assert.equal(digits.length, 6, `label: ${label}`);
      const main = digits.slice(0, 5);
      const bonus = digits[5];
      for (const n of main) assert.ok(n !== undefined && n >= 1 && n <= 69);
      assert.ok(bonus !== undefined && bonus >= 1 && bonus <= 26);
    }
    assert.equal(
      doc.getElementById("gen-status")?.textContent,
      "3 new lottery number sets generated.",
    );
  });

  it("Mega Millions page: locked config 5/70 + 1/24", async () => {
    const { dom, doc } = await loadInteractivePage(
      "mega-millions-number-generator/index.html",
      "http://localhost:4321/mega-millions-number-generator/",
    );
    const form = doc.getElementById("gen-form") as HTMLFormElement;
    assert.equal(form.dataset.locked, "true");
    assert.equal(form.dataset.mainPool, "70");
    assert.equal(form.dataset.bonusPool, "24");
    setValue(doc, "gen-qty", "2");
    submitForm(dom, doc, "gen-form");
    assert.equal(doc.querySelectorAll("#gen-list li").length, 2);
  });
});

describe("combination generator (built DOM)", () => {
  it("counts 6/49 combinations: 13,983,816 via the shared engine", async () => {
    const { dom, doc } = await loadInteractivePage(
      "lottery-combination-generator/index.html",
      "http://localhost:4321/lottery-combination-generator/",
    );
    setValue(doc, "combo-main-pick", "6");
    setValue(doc, "combo-main-pool", "49");
    setValue(doc, "combo-bonus-pick", "0");
    setValue(doc, "combo-bonus-pool", "0");
    setValue(doc, "combo-price", "2");
    submitForm(dom, doc, "combo-form");
    assert.equal(doc.getElementById("combo-total")?.textContent, "13,983,816");
    assert.equal(doc.getElementById("combo-odds")?.textContent, "1 in 13,983,816");
    assert.equal(doc.getElementById("combo-cost")?.textContent, "$27,967,632");
    assert.equal((doc.getElementById("combo-copy") as HTMLButtonElement).disabled, false);
  });

  it("shows a friendly error for invalid input", async () => {
    const { dom, doc } = await loadInteractivePage(
      "lottery-combination-generator/index.html",
      "http://localhost:4321/lottery-combination-generator/",
    );
    setValue(doc, "combo-main-pick", "70");
    setValue(doc, "combo-main-pool", "69");
    submitForm(dom, doc, "combo-form");
    const err = doc.getElementById("combo-error")?.textContent ?? "";
    assert.ok(err.length > 0, "error shown");
    assert.ok(doc.getElementById("combo-results")?.classList.contains("hidden"));
  });

  it("renders the build-time worked examples", () => {
    const doc = new JSDOM(pageHtml("lottery-combination-generator/index.html")).window.document;
    const text = doc.body.textContent ?? "";
    assert.ok(text.includes("292,201,338"), "Powerball total in worked examples");
    assert.ok(text.includes("290,472,336"), "Mega Millions total in worked examples");
    assert.ok(text.includes("13,983,816"), "6/49 total in worked examples");
  });
});
