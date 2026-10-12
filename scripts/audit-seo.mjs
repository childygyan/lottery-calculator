#!/usr/bin/env node
/**
 * scripts/audit-seo.mjs — dependency-free SEO audit of the built site.
 *
 * Reads dist HTML pages directly (no build, no TS imports). Slug inventory is
 * extracted from src/data/seo-pages.ts with a regex on `slug: "..."`.
 *
 * Usage: node scripts/audit-seo.mjs   (wired as `npm run audit:seo`)
 *
 * Exit code: 1 if and only if CRITICAL findings > 0, else 0.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(join(fileURLToPath(import.meta.url), "..", ".."));
const DIST = join(ROOT, "dist");
const SITE = "https://lotterycalculator.site";
const WORDS_THIN = 300;
const JACCARD_WARN = 0.9;
const DEPTH_WARN = 4;
const SIZE_WARN = 100 * 1024;
const SIZE_CRIT = 200 * 1024;

const findings = { critical: [], warning: [], info: [] };
const crit = (check, msg) => findings.critical.push(`[${check}] ${msg}`);
const warn = (check, msg) => findings.warning.push(`[${check}] ${msg}`);
const info = (check, msg) => findings.info.push(`[${check}] ${msg}`);

const LIST_CAP = 15;
function summarize(items, fmt = (x) => x) {
  const shown = items.slice(0, LIST_CAP).map(fmt);
  if (items.length > LIST_CAP) shown.push(`…and ${items.length - LIST_CAP} more`);
  return shown.join("\n    ");
}

// ---------------------------------------------------------------------------
// 0. Collect pages
// ---------------------------------------------------------------------------
function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

/** dist/about/index.html -> "/about", dist/index.html -> "/", dist/404.html -> "/404" */
function pathFor(file) {
  let rel = file.slice(DIST.length).replace(/\\/g, "/");
  if (rel === "/index.html") return "/";
  if (rel.endsWith("/index.html")) return rel.slice(0, -"/index.html".length) || "/";
  return rel.slice(0, -".html".length); // e.g. /404
}

const files = walk(DIST);
const pages = new Map(); // urlPath -> { file, html, size }
for (const f of files) {
  const html = readFileSync(f, "utf8");
  pages.set(pathFor(f), { file: f, html, size: Buffer.byteLength(html, "utf8") });
}

// ---------------------------------------------------------------------------
// 1. Parse helpers
// ---------------------------------------------------------------------------
const stripTags = (s) => s.replace(/<[^>]*>/g, " ");
const decodeEntities = (s) =>
  s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));

function visibleText(html) {
  let t = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  t = stripTags(t);
  t = decodeEntities(t);
  return t.replace(/\s+/g, " ").trim();
}
const wordsOf = (t) => (t ? t.split(" ").filter(Boolean) : []);

function matchAll(re, s) {
  const out = [];
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(s))) out.push(m);
  return out;
}

const data = new Map(); // urlPath -> parsed
for (const [p, pg] of pages) {
  const { html } = pg;
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const descM = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i
  ) || html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i);
  const h1s = matchAll(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/gi, html).map((m) =>
    decodeEntities(stripTags(m[1])).replace(/\s+/g, " ").trim()
  );
  const canM = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  const hrefs = matchAll(/<a(?:\s[^>]*)?href=["']([^"']+)["']/gi, html).map((m) => m[1]);
  const ldBlocks = matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    html
  ).map((m) => m[1].trim());
  const text = visibleText(html);
  const words = wordsOf(text);
  data.set(p, {
    title: title ? decodeEntities(title).replace(/\s+/g, " ").trim() : null,
    description: descM ? decodeEntities(descM[1]).replace(/\s+/g, " ").trim() : null,
    h1s,
    canonical: canM ? canM[1].trim() : null,
    hrefs,
    ldBlocks,
    words,
    wordCount: words.length,
  });
}

info("pages", `${pages.size} HTML pages audited in dist/`);

// ---------------------------------------------------------------------------
// 2. H1 checks
// ---------------------------------------------------------------------------
{
  const byText = new Map();
  for (const [p, d] of data) {
    if (d.h1s.length === 0) crit("h1", `${p}: missing <h1>`);
    else if (d.h1s.length > 1)
      crit("h1", `${p}: ${d.h1s.length} <h1> elements (expected exactly 1)`);
    const key = d.h1s[0] || "";
    if (!byText.has(key)) byText.set(key, []);
    byText.get(key).push(p);
  }
  for (const [text, ps] of byText) {
    if (ps.length > 1 && text)
      warn("h1", `duplicate H1 "${text.slice(0, 60)}" on ${ps.length} pages:\n    ${summarize(ps)}`);
  }
}

// ---------------------------------------------------------------------------
// 3. Duplicate title / meta description
// ---------------------------------------------------------------------------
function dupCheck(field, label) {
  const byVal = new Map();
  for (const [p, d] of data) {
    const v = d[field];
    if (!v) continue;
    if (!byVal.has(v)) byVal.set(v, []);
    byVal.get(v).push(p);
  }
  for (const [v, ps] of byVal) {
    if (ps.length > 1) {
      const msg = `duplicate ${label} "${v.slice(0, 70)}${v.length > 70 ? "…" : ""}" on ${ps.length} pages:\n    ${summarize(ps)}`;
      if (ps.length > 3) crit(`dup-${field}`, msg);
      else warn(`dup-${field}`, msg);
    }
  }
}
dupCheck("title", "title");
dupCheck("description", "meta description");
{
  for (const [p, d] of data) {
    if (!d.title) warn("meta", `${p}: missing <title>`);
    if (!d.description) warn("meta", `${p}: missing meta description`);
  }
}

// ---------------------------------------------------------------------------
// 4. Canonical
// ---------------------------------------------------------------------------
{
  for (const [p, d] of data) {
    if (!d.canonical) {
      crit("canonical", `${p}: missing <link rel="canonical">`);
      continue;
    }
    let url;
    try {
      url = new URL(d.canonical);
    } catch {
      crit("canonical", `${p}: canonical is not a valid absolute URL (${d.canonical})`);
      continue;
    }
    if (url.origin !== SITE) {
      crit("canonical", `${p}: canonical origin ${url.origin} != ${SITE}`);
      continue;
    }
    const canonPath = (url.pathname.replace(/\/+$/, "") || "/");
    if (canonPath !== p)
      crit("canonical", `${p}: canonical path ${url.pathname} does not match page path`);
  }
}

// ---------------------------------------------------------------------------
// 5. Broken internal links
// ---------------------------------------------------------------------------
function distExists(urlPath) {
  if (urlPath === "/") return pages.has("/");
  if (pages.has(urlPath)) return true;
  // tolerate /foo vs /foo/ mismatch in hrefs (both map to same dist file)
  const alt = urlPath.endsWith("/") ? urlPath.slice(0, -1) : urlPath + "/";
  if (pages.has(alt)) return true;
  // /404 style: dist/404.html -> "/404"
  return false;
}

const incoming = new Map([...pages.keys()].map((p) => [p, 0]));
const outLinks = new Map(); // urlPath -> Set(urlPath)
{
  for (const [p, d] of data) {
    const targets = new Set();
    for (const raw of d.hrefs) {
      if (raw.startsWith("//")) continue; // protocol-relative: external
      let h = raw.split("#")[0].split("?")[0];
      if (!h || !h.startsWith("/")) continue;
      h = h.replace(/\/+$/, "") || "/";
      if (!distExists(h)) {
        // Fallback: anchor may point at a static asset (svg, css, txt, …)
        const fsPath = join(DIST, decodeURIComponent(h));
        if (!(existsSync(fsPath) && statSync(fsPath).isFile()))
          crit("links", `${p}: broken internal link -> ${raw}`);
        continue;
      }
      const canon = pages.has(h) ? h : h.endsWith("/") ? h.slice(0, -1) : h + "/";
      targets.add(canon);
    }
    outLinks.set(p, targets);
    for (const t of targets) incoming.set(t, (incoming.get(t) || 0) + 1);
  }
}

// ---------------------------------------------------------------------------
// 6. Orphans (no incoming internal links)
// ---------------------------------------------------------------------------
{
  const orphans = [...pages.keys()].filter(
    (p) => p !== "/404" && (incoming.get(p) || 0) === 0
  );
  for (const p of orphans) warn("orphans", `${p}: zero incoming internal links`);
  if (!orphans.length) info("orphans", "no orphan pages (excluding /404)");
}

// ---------------------------------------------------------------------------
// 7. Crawl depth (BFS from /)
// ---------------------------------------------------------------------------
{
  const depth = new Map([["/", 0]]);
  const queue = ["/"];
  while (queue.length) {
    const cur = queue.shift();
    for (const t of outLinks.get(cur) || []) {
      if (!depth.has(t)) {
        depth.set(t, depth.get(cur) + 1);
        queue.push(t);
      }
    }
  }
  const unreachable = [...pages.keys()].filter((p) => !depth.has(p) && p !== "/404");
  let maxDepth = 0;
  for (const d of depth.values()) maxDepth = Math.max(maxDepth, d);
  info("depth", `max crawl depth from / is ${maxDepth} (${depth.size}/${pages.size} pages reachable)`);
  for (const [p, d] of [...depth.entries()].sort((a, b) => b[1] - a[1])) {
    if (d > DEPTH_WARN) warn("depth", `${p}: crawl depth ${d} (> ${DEPTH_WARN})`);
  }
  for (const p of unreachable)
    warn("depth", `${p}: unreachable from / (crawl depth unknown)`);
}

// ---------------------------------------------------------------------------
// 8. Thin content
// ---------------------------------------------------------------------------
{
  for (const [p, d] of [...data.entries()].sort((a, b) => a[1].wordCount - b[1].wordCount)) {
    if (d.wordCount < WORDS_THIN)
      warn("thin", `${p}: only ${d.wordCount} visible words (< ${WORDS_THIN})`);
  }
  const counts = [...data.values()].map((d) => d.wordCount).sort((a, b) => a - b);
  info(
    "thin",
    `median visible words/page: ${counts[Math.floor(counts.length / 2)]}`
  );
}

// ---------------------------------------------------------------------------
// 9. Near-duplicate content (shingle Jaccard)
// ---------------------------------------------------------------------------
{
  const K = 5;
  const shingles = new Map();
  for (const [p, d] of data) {
    const set = new Set();
    const w = d.words.map((x) => x.toLowerCase());
    for (let i = 0; i + K <= w.length; i++) set.add(w.slice(i, i + K).join(" "));
    shingles.set(p, set);
  }
  const keys = [...shingles.keys()];
  let pairs = 0;
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = shingles.get(keys[i]);
      const b = shingles.get(keys[j]);
      if (!a.size || !b.size) continue;
      const [small, big] = a.size < b.size ? [a, b] : [b, a];
      let inter = 0;
      for (const s of small) if (big.has(s)) inter++;
      const jacc = inter / (a.size + b.size - inter);
      if (jacc > JACCARD_WARN) {
        pairs++;
        if (pairs <= LIST_CAP)
          warn("near-dup", `${keys[i]} <-> ${keys[j]}: Jaccard ${jacc.toFixed(3)} (> ${JACCARD_WARN})`);
      }
    }
  }
  if (pairs > LIST_CAP) warn("near-dup", `…and ${pairs - LIST_CAP} more near-duplicate pairs`);
  info("near-dup", `${pairs} near-duplicate pairs (Jaccard > ${JACCARD_WARN})`);
}

// ---------------------------------------------------------------------------
// 10. Registry reconciliation (src/data/seo-pages.ts)
// ---------------------------------------------------------------------------
{
  const src = readFileSync(join(ROOT, "src", "data", "seo-pages.ts"), "utf8");
  const slugs = new Set(
    matchAll(/slug:\s*"([^"]+)"/g, src).map((m) => {
      const s = m[1].replace(/\/+$/, "") || "/";
      return s;
    })
  );
  info("registry", `${slugs.size} literal slugs in src/data/seo-pages.ts`);
  const missing = [...slugs].filter((s) => !pages.has(s));
  for (const s of missing) crit("registry", `registry slug ${s}/ has no dist/ page`);

  // Programmatic route families expanded from the same data modules the
  // registry describes (51 state pages + 5 jackpot-amount pages) are not
  // literal `slug: "..."` entries, so allow them on the dist -> registry side.
  const programmatic = (p) =>
    /^\/lottery-tax-calculator\/[^/]+$/.test(p) ||
    /^\/lottery-payout-calculator\/[^/]+$/.test(p);
  const unregistered = [...pages.keys()].filter(
    (p) => p !== "/404" && !slugs.has(p) && !programmatic(p)
  );
  for (const p of unregistered)
    crit("registry", `dist page ${p} has no registry slug in seo-pages.ts`);
  if (!missing.length && !unregistered.length)
    info("registry", "registry <-> dist fully reconciled");
}

// ---------------------------------------------------------------------------
// 11. Schema (JSON-LD)
// ---------------------------------------------------------------------------
function ldTypes(block) {
  try {
    const obj = JSON.parse(block);
    const arr = Array.isArray(obj) ? obj : [obj];
    const types = [];
    const walkO = (o) => {
      if (!o || typeof o !== "object") return;
      if (o["@type"]) (Array.isArray(o["@type"]) ? o["@type"] : [o["@type"]]).forEach((t) => types.push(t));
      if (Array.isArray(o["@graph"])) o["@graph"].forEach(walkO);
    };
    arr.forEach(walkO);
    return types;
  } catch {
    return null; // unparseable
  }
}
{
  for (const [p, d] of data) {
    if (!d.ldBlocks.length) {
      warn("schema", `${p}: no JSON-LD block`);
      continue;
    }
    if (d.ldBlocks.some((b) => ldTypes(b) === null))
      warn("schema", `${p}: has unparseable JSON-LD`);
    if (p !== "/") {
      const types = d.ldBlocks.flatMap((b) => ldTypes(b) || []);
      if (!types.some((t) => /breadcrumblist/i.test(t)))
        warn("schema", `${p}: no BreadcrumbList JSON-LD`);
    }
  }
}

// ---------------------------------------------------------------------------
// 12. Sitemap
// ---------------------------------------------------------------------------
{
  const readXml = (f) => readFileSync(f, "utf8");
  const indexXml = readXml(join(DIST, "sitemap-index.xml"));
  const childLocs = matchAll(/<loc>([^<]+)<\/loc>/g, indexXml).map((m) => m[1].trim());
  const sitemapPaths = new Set();
  for (const loc of childLocs) {
    const name = new URL(loc).pathname.split("/").pop();
    const xml = readXml(join(DIST, name));
    for (const m of matchAll(/<loc>([^<]+)<\/loc>/g, xml)) {
      const u = new URL(m[1].trim());
      sitemapPaths.add(u.pathname.replace(/\/+$/, "") || "/");
    }
  }
  info("sitemap", `${sitemapPaths.size} URLs across ${childLocs.length} sitemap file(s)`);
  for (const sp of [...sitemapPaths].sort()) {
    if (!distExists(sp)) crit("sitemap", `sitemap URL ${sp}/ has no dist/ page`);
  }
  for (const p of [...pages.keys()].sort()) {
    if (p === "/404") continue; // 404 must never be in the sitemap
    if (!sitemapPaths.has(p)) warn("sitemap", `dist page ${p} missing from sitemap`);
  }
}

// ---------------------------------------------------------------------------
// 13. _redirects sanity
// ---------------------------------------------------------------------------
{
  let text = "";
  try {
    text = readFileSync(join(DIST, "_redirects"), "utf8");
  } catch {
    crit("redirects", "dist/_redirects is missing");
  }
  const rules = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split(/\s+/));
  if (!rules.length && text !== undefined) crit("redirects", "dist/_redirects is empty");
  const seenFrom = new Map();
  for (const [from, to] of rules) {
    if (!from || !to) {
      warn("redirects", `malformed rule: "${from || ""} ${to || ""}"`);
      continue;
    }
    const nFrom = from.split("?")[0].split("#")[0];
    const nTo = to.split("?")[0].split("#")[0];
    // Trailing-slash normalization (/foo -> /foo/) is legitimate; an exact
    // from === to rule is a true self-redirect loop.
    if (nFrom === nTo && from.startsWith("/") && to.startsWith("/"))
      crit("redirects", `self-redirect loop: ${from} -> ${to}`);
    seenFrom.set(from, (seenFrom.get(from) || 0) + 1);
  }
  for (const [from, n] of seenFrom) {
    if (n > 1) warn("redirects", `duplicate "from" path ${from} (${n} rules)`);
  }
  info("redirects", `${rules.length} redirect rule(s) in dist/_redirects`);
}

// ---------------------------------------------------------------------------
// 14. Page size
// ---------------------------------------------------------------------------
{
  for (const [p, pg] of [...pages.entries()].sort((a, b) => b[1].size - a[1].size)) {
    const kb = (pg.size / 1024).toFixed(1);
    if (pg.size > SIZE_CRIT) crit("size", `${p}: ${kb} KB HTML (> 200 KB)`);
    else if (pg.size > SIZE_WARN) warn("size", `${p}: ${kb} KB HTML (> 100 KB)`);
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
function section(name, items) {
  console.log(`${name}: ${items.length}`);
  for (const f of items) console.log(`  - ${f}`);
}
section("CRITICAL", findings.critical);
section("WARNING", findings.warning);
section("INFO", findings.info);

const c = findings.critical.length;
const w = findings.warning.length;
console.log(
  `\nSUMMARY: ${pages.size} pages audited — ${c} critical, ${w} warning, ${findings.info.length} info`
);
process.exitCode = c > 0 ? 1 : 0;
