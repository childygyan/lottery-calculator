#!/usr/bin/env node
/**
 * Build-time gate: fail `npm run build` when generated pages contain
 * duplicate SEO metadata. Scans every dist HTML page for duplicate
 * <title>, meta description, and canonical URL.
 *
 * Duplicates here mean two URLs competing for the same search intent —
 * they must be fixed (or consolidated) before shipping, never silently
 * published.
 *
 * Dependency-free (regex over the generated <head>): the gate must run in
 * minimal CI/build environments where dev-only packages may be absent.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

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

const all = pages(DIST, "");
// Homepage lives at dist/index.html (base === "").
all.push({ path: join(DIST, "index.html"), slug: "/" });

/** Extract a head field with a tolerant regex — generated markup is ours. */
function field(html, name) {
  let m;
  if (name === "title") {
    m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return (m?.[1] ?? "").trim();
  }
  if (name === "description") {
    m =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ??
      html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    return (m?.[1] ?? "").trim();
  }
  if (name === "canonical") {
    m =
      html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) ??
      html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
    return (m?.[1] ?? "").trim();
  }
  return "";
}

for (const page of all) {
  page.head = readFileSync(page.path, "utf8").split("</head>")[0] ?? "";
}

for (const name of ["title", "description", "canonical"]) {
  const seen = new Map();
  for (const page of all) {
    const value = field(page.head, name);
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
