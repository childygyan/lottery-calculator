/**
 * Phase 6 audit: the 4 odds/probability routes.
 *
 * Checks: unique titles/descriptions/canonicals/H1, breadcrumb UI + JSON-LD,
 * FAQPage JSON-LD, sitemap entries, internal-link integrity (no links to
 * unbuilt routes), duplicate/thin-content signatures, forbidden ranking and
 * gambling-hype language, and the required factual multiple-ticket sentence.
 *
 * Usage: node scripts/audit-odds-pages.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const DIST = join(import.meta.dirname, "..", "dist");
const ROUTES = [
  "lottery-odds-calculator",
  "lottery-probability-calculator",
  "powerball-odds-calculator",
  "mega-millions-odds-calculator",
];

let failures = 0;
let warnings = 0;
const fail = (route, msg) => { failures++; console.log(`FAIL [${route}] ${msg}`); };
const warn = (route, msg) => { warnings++; console.log(`WARN [${route}] ${msg}`); };

function docFor(route) {
  const html = readFileSync(join(DIST, route, "index.html"), "utf8");
  return new JSDOM(html).window.document;
}

const titles = new Map();
const descriptions = new Map();
const signatures = new Map();

for (const route of ROUTES) {
  const doc = docFor(route);
  const text = doc.body.textContent ?? "";

  // -- SEO basics --
  const title = doc.querySelector("title")?.textContent?.trim() ?? "";
  const desc = doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
  if (title.length < 10) fail(route, "title too short");
  if (desc.length < 20) fail(route, "meta description too short");
  if (!canonical.endsWith(`/${route}/`)) fail(route, `canonical mismatch: ${canonical}`);
  if (titles.has(title)) fail(route, `duplicate title with ${titles.get(title)}`);
  if (descriptions.has(desc)) fail(route, `duplicate description with ${descriptions.get(desc)}`);
  titles.set(title, route);
  descriptions.set(desc, route);

  const h1s = doc.querySelectorAll("h1");
  if (h1s.length !== 1) fail(route, `expected 1 h1, found ${h1s.length}`);

  // -- Breadcrumbs UI + JSON-LD --
  if (!doc.querySelector('nav[aria-label="Breadcrumb"]')) fail(route, "breadcrumb nav missing");
  const ld = [...doc.querySelectorAll('script[type="application/ld+json"]')].map((s) =>
    JSON.parse(s.textContent ?? "{}"),
  );
  const types = ld.map((b) => b["@type"]);
  if (!types.includes("BreadcrumbList")) fail(route, "BreadcrumbList JSON-LD missing");
  if (!types.includes("FAQPage")) fail(route, "FAQPage JSON-LD missing");
  if (types.some((t) => /Review|AggregateRating/.test(String(t)))) fail(route, "forbidden review schema");

  // -- Sitemap --
  const sitemap = readFileSync(join(DIST, "sitemap-0.xml"), "utf8");
  if (!sitemap.includes(`/${route}/`)) fail(route, "missing from sitemap");

  // -- Internal links: every /href must resolve to a built page --
  for (const a of doc.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href") ?? "";
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const clean = href.split("?")[0].split("#")[0];
    const target = join(DIST, clean === "/" ? "index.html" : `${clean.replace(/\/$/, "")}/index.html`);
    if (!existsSync(target)) fail(route, `broken internal link: ${href}`);
  }

  // -- Content uniqueness: signature over main content text --
  const main = doc.querySelector("main")?.textContent ?? text;
  const sig = main.replace(/\s+/g, " ").trim().slice(0, 4000);
  if (signatures.has(sig)) fail(route, `duplicate content signature with ${signatures.get(sig)}`);
  signatures.set(sig, route);
  if (main.replace(/\s+/g, " ").trim().length < 2000) warn(route, "thin content (<2000 chars)");

  // -- Forbidden language --
  if (/\b(best|worst|easiest|hardest)\s+(lottery|odds|game|chance)/i.test(text))
    fail(route, "ranking language (best/worst/easiest/hardest)");
  if (/\blucky\b/i.test(text)) fail(route, "'lucky' language");
  if (/guarantee(d|s)? (a |your )?win/i.test(text) && !/never (assures?|guarantees?)/i.test(text))
    fail(route, "win-guarantee language");
  if (/more likely to win/i.test(text)) fail(route, "'more likely to win' language");

  // -- Required factual sentence (multiple tickets) --
  if (!/increases the number of combinations covered/i.test(text))
    fail(route, "missing required multiple-ticket factual sentence");

  // -- Accessibility basics --
  for (const input of doc.querySelectorAll("input, select")) {
    const id = input.getAttribute("id");
    const labelled =
      (id && doc.querySelector(`label[for="${id}"]`)) ||
      input.getAttribute("aria-label") ||
      input.getAttribute("aria-labelledby");
    if (!labelled) fail(route, `unlabeled form control: ${input.outerHTML.slice(0, 80)}`);
  }
  for (const img of doc.querySelectorAll("img")) {
    if (img.getAttribute("alt") === null) fail(route, "img without alt");
  }
}

// Cross-route: footer must list the new pages (site-wide internal linking).
const homeDoc = docFor("");
const homeHrefs = [...homeDoc.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");
for (const route of ROUTES) {
  if (!homeHrefs.includes(`/${route}/`)) warn("home", `footer/cards missing /${route}/`);
}

// Bundle size: total client JS must stay under 120KB (mirrors the DOM test).
const astroDir = join(DIST, "_astro");
let jsTotal = 0;
for (const f of readdirSync(astroDir)) {
  if (f.endsWith(".js")) jsTotal += readFileSync(join(astroDir, f)).length;
}
console.log(`client JS total: ${jsTotal} bytes`);
if (jsTotal > 120_000) fail("bundle", `client JS ${jsTotal} exceeds 120KB`);

console.log(`\n${ROUTES.length} routes audited: ${failures} failures, ${warnings} warnings`);
process.exit(failures > 0 ? 1 : 0);
