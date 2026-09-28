#!/usr/bin/env node
/**
 * Development-only audit for /lottery-tax-calculator/ pages.
 * Run after `npm run build`. Checks SEO metadata, structure, honesty
 * invariants, internal links, sitemap coverage, and duplicate content.
 *
 * Exit 0 = all checks pass. Exit 1 = failures listed.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const BASE = "https://lotterycalculator.example.com";
const DIR = join(DIST, "lottery-tax-calculator");

const failures = [];
const warnings = [];
function fail(msg) { failures.push(msg); }
function warn(msg) { warnings.push(msg); }

function pages() {
  const out = [];
  for (const entry of readdirSync(DIR, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const f = join(DIR, entry.name, "index.html");
      if (existsSync(f)) out.push({ slug: entry.name, file: f });
    }
  }
  const hub = join(DIR, "index.html");
  if (existsSync(hub)) out.push({ slug: null, file: hub });
  return out;
}

function meta(html, name, property) {
  const attr = name ? `name="${name}"` : `property="${property}"`;
  const m = html.match(new RegExp(`<meta ${attr} content="([^"]*)"`, "i"));
  return m ? m[1] : null;
}

function stripScripts(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, " ");
}

const list = pages();
console.log(`Auditing ${list.length} lottery-tax-calculator pages…`);
if (list.length !== 52) fail(`Expected 52 pages (hub + 51 states), found ${list.length}`);

// Track internal links for the link check.
const internalLinks = new Set();

for (const { slug, file } of list) {
  const html = readFileSync(file, "utf8");
  const text = stripScripts(html);
  const label = slug ?? "(hub)";

  // --- H1 ---
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (h1s.length !== 1) fail(`${label}: expected 1 <h1>, found ${h1s.length}`);
  const h1 = h1s[0]?.[1].replace(/<[^>]+>/g, "").trim() ?? "";

  // --- title / description / canonical ---
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] ?? "";
  const desc = meta(html, "description");
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/i) || [])[1];
  const robots = meta(html, "robots");

  if (slug) {
    // State page expectations.
    const stateName = h1.replace(/ Lottery Tax Calculator$/, "");
    if (!stateName || stateName === h1) fail(`${label}: H1 doesn't match "{State} Lottery Tax Calculator": ${h1}`);
    const expectedTitle = `${stateName} Lottery Tax Calculator — Estimate Your Take-Home Winnings`;
    if (title !== expectedTitle) fail(`${label}: title mismatch:\n  got:      ${title}\n  expected: ${expectedTitle}`);
    if (!desc || desc.length < 40) fail(`${label}: meta description missing/too short`);
    if (desc && !desc.includes(stateName)) warn(`${label}: meta description doesn't mention the state`);
    const expectedCanonical = `${BASE}/lottery-tax-calculator/${slug}/`;
    if (canonical !== expectedCanonical) fail(`${label}: canonical mismatch: ${canonical}`);
    if (robots && /noindex/i.test(robots)) fail(`${label}: page is noindexed`);

    // OG tags mirror title/description.
    if (meta(html, null, "og:title") !== title) fail(`${label}: og:title mismatch`);
    if (meta(html, null, "og:description") !== desc) fail(`${label}: og:description mismatch`);

    // Breadcrumb: visible + JSON-LD.
    if (!/aria-label="Breadcrumb"/.test(html)) fail(`${label}: no visible breadcrumb nav`);
    if (!/"@type":"BreadcrumbList"/.test(html)) fail(`${label}: no BreadcrumbList JSON-LD`);
    if (!/"@type":"FAQPage"/.test(html)) fail(`${label}: no FAQPage JSON-LD (FAQs are visible)`);
    if (!html.includes("Lottery Tax Calculator") || !html.includes(stateName)) {
      fail(`${label}: breadcrumb missing expected crumbs`);
    }

    // Calculator default state preselected.
    const code = [...html.matchAll(/<option value="([A-Z]{2})" selected>/g)].map((m) => m[1]);
    if (code.length !== 1) fail(`${label}: expected exactly 1 preselected state option, found ${code.length}`);

    // State name appears in body copy (not just chrome).
    const bodyText = text.replace(/<[^>]+>/g, " ");
    if (!bodyText.includes(stateName)) fail(`${label}: state name not found in page body`);

    // Examples table present with 3 rows.
    const rows = (html.match(/<th scope="row"/g) || []).length;
    if (rows !== 3) fail(`${label}: examples table should have 3 rows, found ${rows}`);
  } else {
    // Hub expectations.
    if (h1 !== "Lottery Tax Calculator") fail(`hub: H1 should be "Lottery Tax Calculator", got: ${h1}`);
    const expectedCanonical = `${BASE}/lottery-tax-calculator/`;
    if (canonical !== expectedCanonical) fail(`hub: canonical mismatch: ${canonical}`);
    if (!/id="state-filter"/.test(html)) fail("hub: state filter input missing");
    if (!/id="state-directory"/.test(html)) fail("hub: state directory missing");
    const links = (html.match(/\/lottery-tax-calculator\/[a-z-]+\//g) || []).length;
    if (links < 51) fail(`hub: expected ≥51 state links, found ${links}`);
  }

  // --- leak checks (visible text only: strip tags AND attributes) ---
  const visible = text.replace(/<[^>]+>/g, " ");
  if (/\bundefined\b/.test(visible)) fail(`${label}: visible "undefined" leak`);
  if (/(^|[^a-zA-Z])null([^a-zA-Z]|$)/.test(visible)) fail(`${label}: visible "null" leak`);
  if (/TODO|FIXME/.test(visible)) fail(`${label}: placeholder marker leak`);
  if (/localhost|127\.0\.0\.1/.test(html)) fail(`${label}: localhost leak`);

  // --- collect internal links ---
  for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
    internalLinks.add(m[1].split("#")[0]);
  }
}

// --- internal link resolution ---
let broken = 0;
for (const href of internalLinks) {
  if (href.startsWith("/_astro/")) continue;
  const file = href === "/" ? join(DIST, "index.html")
    : href.endsWith("/") ? join(DIST, href.slice(1), "index.html")
    : join(DIST, href.slice(1));
  if (!existsSync(file)) { fail(`broken internal link: ${href}`); broken++; }
}
console.log(`Checked ${internalLinks.size} unique internal links (${broken} broken).`);

// --- sitemap coverage ---
const sitemapIdx = readFileSync(join(DIST, "sitemap-index.xml"), "utf8");
const sitemapUrl = (sitemapIdx.match(/<loc>([^<]+)<\/loc>/) || [])[1];
if (!sitemapUrl) {
  fail("sitemap-index.xml has no sitemap loc");
} else {
  const smPath = sitemapUrl.replace(BASE, "");
  const sm = readFileSync(join(DIST, smPath), "utf8");
  const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const missing = [];
  for (const { slug } of list) {
    const u = slug ? `${BASE}/lottery-tax-calculator/${slug}/` : `${BASE}/lottery-tax-calculator/`;
    if (!urls.includes(u)) missing.push(u);
  }
  if (missing.length) fail(`sitemap missing ${missing.length} URLs: ${missing.slice(0, 5).join(", ")}`);
  const dupes = urls.filter((u, i) => urls.indexOf(u) !== i);
  if (dupes.length) fail(`sitemap has duplicates: ${[...new Set(dupes)].join(", ")}`);
  if (/localhost/.test(sm)) fail("sitemap contains localhost");
  console.log(`Sitemap: ${urls.length} URLs, all 52 lottery-tax pages present.`);
}

// --- duplicate content: state-specific sections must actually vary ---
// Normalize the intro + tax explanation + FAQs, strip the state name, hash.
const hashes = new Map();
for (const { slug, file } of list) {
  if (!slug) continue;
  const html = readFileSync(file, "utf8");
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] ?? "";
  const stateName = h1.replace(/ Lottery Tax Calculator$/, "").replace(/<[^>]+>/g, "").trim();
  // Grab the state-specific prose sections.
  const sections = [];
  for (const label of [
    "How .* taxes lottery winnings",
    "Withholding vs\\. your final tax bill",
    "Cash option vs\\. annuity",
  ]) {
    const m = html.match(new RegExp(`aria-label="${label}"[\\s\\S]*?</section>`, "i"));
    if (m) sections.push(m[0]);
  }
  const faqSection = html.match(/<section aria-labelledby="faq-heading"[\s\S]*?<\/section>/i);
  if (faqSection) sections.push(faqSection[0]);
  let combined = sections.join("\n").replace(/<[^>]+>/g, " ");
  combined = combined.split(stateName).join("STATE");
  const hash = createHash("sha256").update(combined).digest("hex").slice(0, 12);
  if (!hashes.has(hash)) hashes.set(hash, []);
  hashes.get(hash).push(slug);
}
const dupGroups = [...hashes.values()].filter((g) => g.length > 1);
if (dupGroups.length) {
  fail(`duplicate state-specific content in ${dupGroups.length} groups: ${dupGroups.map((g) => g.join(",")).join(" | ")}`);
} else {
  console.log(`Duplicate-content check: ${hashes.size} distinct state-content signatures.`);
}

// --- related-state sanity: every page links 2-5 related states ---
for (const { slug, file } of list) {
  if (!slug) continue;
  const html = readFileSync(file, "utf8");
  const nav = html.match(/<nav aria-label="Lottery tax calculators near[^"]*"[\s\S]*?<\/nav>/i);
  const count = nav ? (nav[0].match(/\/lottery-tax-calculator\/[a-z-]+\//g) || []).length : 0;
  if (count < 2 || count > 5) fail(`${slug}: related-states nav has ${count} links (want 2-5)`);
  if (nav && new RegExp(`href="/lottery-tax-calculator/${slug}/"`).test(nav[0])) {
    fail(`${slug}: page links to itself in related states`);
  }
}

console.log(`\n${failures.length} failures, ${warnings.length} warnings.`);
for (const w of warnings) console.log("WARN:", w);
for (const f of failures) console.log("FAIL:", f);
process.exit(failures.length ? 1 : 0);
