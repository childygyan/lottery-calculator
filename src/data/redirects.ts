/**
 * Centralized redirect map.
 *
 * Every redirect is declared here — never scattered across hosting
 * dashboards. scripts/build-redirects.mjs renders this map to
 * dist/_redirects (Netlify / Cloudflare Pages format) after the build.
 *
 * Rules:
 * - 301 for permanent moves, 302 only for temporary ones.
 * - Never create chains (A -> B -> C); always point at the final target.
 * - Trailing-slash normalization for every indexable route is generated
 *   automatically from the SEO registry; manual entries below are for
 *   genuine legacy/variant URLs only.
 */
import { indexablePages } from "./seo-pages.ts";

export interface RedirectRule {
  /** From-path, e.g. "/lottery-tax/". */
  oldPath: string;
  /** Final destination path. Must not itself be a redirect source. */
  newPath: string;
  status: 301 | 302;
}

/**
 * Manual redirects for legacy or variant URLs.
 * Empty by design: the site has no renamed routes yet. Add entries here
 * (oldest -> final target) instead of inventing chains.
 */
export const MANUAL_REDIRECTS: RedirectRule[] = [
  // Example shape (kept commented until a real legacy URL exists):
  // { oldPath: "/old-calculator/", newPath: "/lottery-calculator/", status: 301 },
];

/**
 * Full redirect set: manual entries plus trailing-slash normalization
 * ("/lottery-calculator" -> "/lottery-calculator/") for every indexable
 * route, enforcing the single canonical convention site-wide.
 */
export function allRedirects(): RedirectRule[] {
  const rules: RedirectRule[] = [...MANUAL_REDIRECTS];
  for (const page of indexablePages()) {
    if (page.slug === "/") continue;
    const bare = page.slug.replace(/\/$/, "");
    rules.push({ oldPath: bare, newPath: page.slug, status: 301 });
  }
  return rules;
}

/** Detect chains (A->B where B is itself a source) and loops. */
export function validateRedirects(rules: RedirectRule[]): string[] {
  const problems: string[] = [];
  const targets = new Map(rules.map((r) => [r.oldPath, r.newPath]));
  for (const rule of rules) {
    if (rule.oldPath === rule.newPath) {
      problems.push(`Self-redirect: ${rule.oldPath}`);
    }
    const hop = targets.get(rule.newPath);
    if (hop) {
      problems.push(
        `Redirect chain: ${rule.oldPath} -> ${rule.newPath} -> ${hop} (point ${rule.oldPath} directly at ${hop})`,
      );
    }
  }
  return problems;
}
