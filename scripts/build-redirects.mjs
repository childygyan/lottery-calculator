#!/usr/bin/env node
/**
 * Render src/data/redirects.ts to dist/_redirects (Netlify / Cloudflare
 * Pages format) and validate the map: no chains, no loops, no
 * self-redirects, and every target must be a real route.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { allRedirects, validateRedirects } from "../src/data/redirects.ts";
import { indexablePages } from "../src/data/seo-pages.ts";

const rules = allRedirects();
const problems = validateRedirects(rules);

const known = new Set(indexablePages().map((p) => p.slug));
for (const rule of rules) {
  if (!known.has(rule.newPath)) {
    problems.push(`Redirect target is not a known route: ${rule.oldPath} -> ${rule.newPath}`);
  }
}

if (problems.length > 0) {
  console.error("Redirect validation failed:");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

mkdirSync("dist", { recursive: true });
const body = rules.map((r) => `${r.oldPath}  ${r.newPath}  ${r.status}`).join("\n") + "\n";
writeFileSync("dist/_redirects", body);
console.log(`Wrote dist/_redirects with ${rules.length} rules, 0 problems.`);
