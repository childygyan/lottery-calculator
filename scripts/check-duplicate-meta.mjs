#!/usr/bin/env node
/**
 * Build-time gate: fail `npm run build` when generated pages contain
 * duplicate SEO metadata. Scans every dist HTML page for duplicate
 * <title>, meta description, and canonical URL.
 *
 * Duplicates here mean two URLs competing for the same search intent —
 * they must be fixed (or consolidated) before shipping, never silently
 * published.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";

const DIST = "dist";
const failures = [];

function pages(dir, base) {
  const out = [];
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) out.push(...pages(p, `${base}/${f.name}`));
    else if (f.name === "index.html" && base) out.push({ path: p, slug: `${base}/` });
  }
  return out;
}
// Homepage lives at dist/index.html (base === "").
for (const f of readdirSync(DIST, { withFileTypes: true })) {
  if (f.isFile() && f.name === "index.html") {
    // handled below
  }
}

const all = pages(DIST, "");
{
  const doc = new JSDOM(readFileSync(join(DIST, "index.html"), "utf8")).window.document;
  all.push({ path: join(DIST, "index.html"), slug: "/", doc });
}
for (const page of all) {
  if (!page.doc) {
    page.doc = new JSDOM(readFileSync(page.path, "utf8")).window.document;
  }
}

function field(doc, name) {
  if (name === "title") return (doc.querySelector("title")?.textContent ?? "").trim();
  if (name === "description")
    return (doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? "").trim();
  if (name === "canonical")
    return (doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "").trim();
  return "";
}

for (const name of ["title", "description", "canonical"]) {
  const seen = new Map();
  for (const page of all) {
    const value = field(page.doc, name);
    if (!value) {
      failures.push(`Missing ${name}: ${page.slug}`);
      continue;
    }
    if (!seen.has(value)) seen.set(value, []);
    seen.get(value).push(page.slug);
  }
  for (const [value, slugs] of seen) {
    if (slugs.length > 1) {
      failures.push(
        `Duplicate ${name} on ${slugs.length} pages: ${slugs.join(", ")}\n    value: ${value.slice(0, 100)}`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error(`Duplicate/missing SEO metadata gate FAILED (${failures.length}):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`SEO metadata gate passed: ${all.length} pages, unique title/description/canonical.`);
