/**
 * Phase 7 audit: the 4 generator routes.
 *
 * Checks: unique titles/descriptions/canonicals/H1, breadcrumb UI + JSON-LD,
 * FAQPage JSON-LD (no Review/Rating schema), sitemap entries, internal-link
 * integrity, unique non-thin content, accessible labels, the EXACT required
 * disclaimer sentence, and forbidden prediction/luck/hot/cold/due/odds
 * language. Usage: node scripts/audit-generator-pages.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const DIST = join(import.meta.dirname, "..", "dist");
const ROUTES = [
  "lottery-number-generator",
  "powerball-number-generator",
  "mega-millions-number-generator",
  "lottery-combination-generator",
];

const DISCLAIMER =
  "These numbers are randomly generated for entertainment and convenience. " +
  "Randomly generated numbers do not improve the mathematical odds of winning " +
  "and cannot predict future winning numbers.";

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
  const main = doc.querySelector("main")?.textContent ?? text;

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

  // -- Internal links --
  for (const a of doc.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href") ?? "";
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const clean = href.split("?")[0].split("#")[0];
    const target = join(DIST, clean === "/" ? "index.html" : `${clean.replace(/\/$/, "")}/index.html`);
    if (!existsSync(target)) fail(route, `broken internal link: ${href}`);
  }

  // -- Content uniqueness / thinness --
  const sig = main.replace(/\s+/g, " ").trim().slice(0, 4000);
  if (signatures.has(sig)) fail(route, `duplicate content signature with ${signatures.get(sig)}`);
  signatures.set(sig, route);
  if (main.replace(/\s+/g, " ").trim().length < 2000) warn(route, "thin content (<2000 chars)");

  // -- Required disclaimer (only on the 3 number-generator pages) --
  if (route !== "lottery-combination-generator") {
    if (!text.includes(DISCLAIMER)) fail(route, "required disclaimer sentence missing");
  }

  // -- Forbidden prediction / luck / odds language --
  // Denials ("cannot predict…", "no hot or cold numbers") are legitimate honesty
  // copy — strip them before checking for positive claims.
  const claims = text
    .replace(/cannot predict[^.]*\./gi, "")
    .replace(/can (the generator|this tool|it) predict[^.?]*[.?]/gi, "")
    .replace(/no tool here analyzes historical draws or predicts anything\.?/gi, "")
    .replace(/no hot or cold numbers/gi, "")
    .replace(/your lucky numbers/gi, "");
  const forbidden = [
    [/lucky numbers?/i, "'lucky number' claim"],
    [/hot numbers?/i, "'hot number' claim"],
    [/cold numbers?/i, "'cold number' claim"],
    [/due numbers?/i, "'due number' claim"],
    [/predict (the |future |winning |your )/i, "prediction claim"],
    [/more likely to win/i, "'more likely to win' claim"],
    [/increase (your |the )?(odds|chances)/i, "odds-increase claim"],
    [/improve (your |the )?(odds|chances)/i, "odds-improvement claim"],
    [/guarantee(d|s)? (a |your )?win/i, "win-guarantee claim"],
    [/statistically better/i, "'statistically better' claim"],
  ];
  for (const [re, label] of forbidden) {
    if (re.test(claims)) fail(route, `forbidden: ${label}`);
  }
  // "AI prediction" must not exist anywhere on these pages.
  if (/\bAI\b.*predict/i.test(text)) fail(route, "AI-prediction language");

  // -- Game pages: locked rules + derived odds must be visible --
  if (route === "powerball-number-generator") {
    if (!/292,201,338/.test(text)) fail(route, "verified jackpot odds not shown");
    if (!/69/.test(text)) warn(route, "white-ball pool not mentioned");
  }
  if (route === "mega-millions-number-generator") {
    if (!/290,472,336/.test(text)) fail(route, "verified jackpot odds not shown");
  }

  // -- Accessibility basics --
  for (const input of doc.querySelectorAll("input, select")) {
    const id = input.getAttribute("id");
    const labelled =
      (id && doc.querySelector(`label[for="${id}"]`)) ||
      input.closest("label") || // wrapping label is a valid association
      input.getAttribute("aria-label") ||
      input.getAttribute("aria-labelledby");
    if (!labelled) fail(route, `unlabeled form control: ${input.outerHTML.slice(0, 80)}`);
  }
  for (const img of doc.querySelectorAll("img")) {
    if (img.getAttribute("alt") === null) fail(route, "img without alt");
  }
  // Result region must be aria-live.
  if (route !== "lottery-combination-generator") {
    if (!doc.querySelector('[aria-live="polite"]')) fail(route, "no aria-live region");
  }
}

// Cross-route: homepage must link the new generator routes.
const homeDoc = docFor("");
const homeHrefs = [...homeDoc.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");
for (const route of ROUTES) {
  if (!homeHrefs.includes(`/${route}/`)) fail("home", `missing link to /${route}/`);
}

// Bundle size check.
const astroDir = join(DIST, "_astro");
let jsTotal = 0;
for (const f of readdirSync(astroDir)) {
  if (f.endsWith(".js")) jsTotal += readFileSync(join(astroDir, f)).length;
}
console.log(`client JS total: ${jsTotal} bytes`);
if (jsTotal > 120_000) fail("bundle", `client JS ${jsTotal} exceeds 120KB`);

console.log(`\n${ROUTES.length} routes audited: ${failures} failures, ${warnings} warnings`);
process.exit(failures > 0 ? 1 : 0);
