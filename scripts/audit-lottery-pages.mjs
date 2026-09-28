#!/usr/bin/env node
/**
 * Development-only audit for the Phase 4 lottery game pages.
 * Run after `npm run build`. Checks SEO metadata, structure, honesty
 * invariants (no invented cash values or rules), internal links, and
 * sitemap coverage for the 4 game routes.
 *
 * Exit 0 = all checks pass. Exit 1 = failures listed.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const BASE = "https://lotterycalculator.example.com";

const PAGES = [
  { slug: "powerball-calculator", title: "Powerball Calculator — Estimate Taxes & Take-Home Winnings", h1: "Powerball Calculator" },
  { slug: "mega-millions-calculator", title: "Mega Millions Calculator — Estimate Taxes & Take-Home Winnings", h1: "Mega Millions Calculator" },
  { slug: "powerball-tax-calculator", title: "Powerball Tax Calculator — Federal & State Tax on Winnings", h1: "Powerball Tax Calculator" },
  { slug: "mega-millions-tax-calculator", title: "Mega Millions Tax Calculator — Federal & State Tax on Winnings", h1: "Mega Millions Tax Calculator" },
];

const failures = [];
const warnings = [];
function fail(msg) { failures.push(msg); }
function warn(msg) { warnings.push(msg); }

function meta(html, name, property) {
  const attr = name ? `name="${name}"` : `property="${property}"`;
  const m = html.match(new RegExp(`<meta ${attr} content="([^"]*)"`, "i"));
  return m ? m[1] : null;
}

console.log(`Auditing ${PAGES.length} lottery game pages…`);

for (const page of PAGES) {
  const file = join(DIST, page.slug, "index.html");
  if (!existsSync(file)) {
    fail(`${page.slug}: built page missing at dist/${page.slug}/index.html`);
    continue;
  }
  const html = readFileSync(file, "utf8");
  const label = page.slug;

  // --- SEO basics ---
  const rawTitle = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] ?? "";
  const title = rawTitle.replace(/&amp;/g, "&");
  if (title !== page.title) fail(`${label}: title mismatch (got "${title}")`);
  const desc = meta(html, "description", null);
  if (!desc || desc.length < 50) fail(`${label}: meta description missing or too short`);
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/i);
  if (!canonical || canonical[1] !== `${BASE}/${page.slug}/`) {
    fail(`${label}: canonical wrong (got "${canonical?.[1]}")`);
  }
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];
  if (!h1 || h1.replace(/<[^>]+>/g, "").trim() !== page.h1) {
    fail(`${label}: h1 mismatch`);
  }

  // --- Structured data ---
  if (!html.includes("BreadcrumbList")) fail(`${label}: missing BreadcrumbList JSON-LD`);
  if (!html.includes("FAQPage")) fail(`${label}: missing FAQPage JSON-LD`);
  if (/aggregateRating|review/i.test(html)) fail(`${label}: fake rating/review schema detected`);

  // --- Honesty invariants ---
  if (!html.includes("Enter the current cash value to calculate an estimate.")) {
    fail(`${label}: missing the no-invention cash-value hint`);
  }
  if (/lorem ipsum/i.test(html)) fail(`${label}: placeholder text detected`);
  if (/undefined|NaN/.test(html.replace(/<script[\s\S]*?<\/script>/g, " "))) {
    fail(`${label}: rendered "undefined" or "NaN" in visible HTML`);
  }

  // --- Calculator wiring ---
  if (!html.includes('id="lottery-form"')) fail(`${label}: calculator form missing`);

  // --- Internal links: only to existing routes ---
  const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
  const unique = [...new Set(hrefs)].filter((h) => !h.startsWith("#"));
  for (const href of unique) {
    if (href.startsWith("/_astro/")) continue;
    const targetFile =
      href === "/"
        ? join(DIST, "index.html")
        : href.endsWith("/")
          ? join(DIST, href.slice(1), "index.html")
          : join(DIST, href.slice(1));
    if (!existsSync(targetFile)) fail(`${label}: broken internal link ${href}`);
  }

  // --- Cross-linking between the four game pages ---
  // Tax pages must link their calculator sibling; calculator pages must link their tax sibling.
  const requiredSibling =
    page.slug === "powerball-calculator" ? "/powerball-tax-calculator/" :
    page.slug === "mega-millions-calculator" ? "/mega-millions-tax-calculator/" :
    page.slug === "powerball-tax-calculator" ? "/powerball-calculator/" :
    "/mega-millions-calculator/";
  if (!unique.includes(requiredSibling)) fail(`${label}: missing required sibling link ${requiredSibling}`);
}

// --- Sitemap coverage ---
const sitemapIdx = readFileSync(join(DIST, "sitemap-index.xml"), "utf8");
const sitemapUrl = (sitemapIdx.match(/<loc>([^<]+)<\/loc>/) || [])[1];
if (!sitemapUrl) {
  fail("sitemap index has no <loc>");
} else {
  const sm = readFileSync(join(DIST, sitemapUrl.split("/").pop()), "utf8");
  for (const page of PAGES) {
    const url = `${BASE}/${page.slug}/`;
    const count = sm.split(url).length - 1;
    if (count !== 1) fail(`sitemap: ${url} appears ${count} times (expected 1)`);
  }
}

// --- No duplicate titles/descriptions across the four pages ---
const seen = new Map();
for (const page of PAGES) {
  const html = readFileSync(join(DIST, page.slug, "index.html"), "utf8");
  const desc = meta(html, "description", null) ?? "";
  const key = `${page.title}||${desc}`;
  if (seen.has(key)) fail(`duplicate title+description: ${page.slug} and ${seen.get(key)}`);
  seen.set(key, page.slug);
}

console.log(`\nFailures: ${failures.length}, warnings: ${warnings.length}`);
for (const f of failures) console.log(`  FAIL: ${f}`);
for (const w of warnings) console.log(`  WARN: ${w}`);
process.exit(failures.length ? 1 : 0);
