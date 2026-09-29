/**
 * Centralized breadcrumb generator.
 *
 * Trails come from the SEO page registry (src/data/seo-pages.ts), which
 * declares each page's parent. Pages must NOT hand-write their own crumb
 * arrays — call breadcrumbItems(path) for the visible trail and
 * breadcrumbJsonLdFor(path) for the JSON-LD block.
 *
 * The last trail item (the current page) is rendered without a link in
 * the visible UI, but keeps its URL in the JSON-LD.
 */
import {
  pageTrail,
  getPageEntry,
} from "../../data/seo-pages.ts";
import { absoluteUrl, breadcrumbJsonLd } from "./metadata.ts";

export interface VisibleCrumb {
  name: string;
  href?: string;
}

/**
 * Visible breadcrumb items for a site path. Throws in development when the
 * path has no registry entry, so missing pages fail loudly instead of
 * rendering a broken trail.
 */
export function breadcrumbItems(path: string): VisibleCrumb[] {
  const trail = pageTrail(path);
  if (trail.length === 0) {
    throw new Error(`[seo] No registry entry for breadcrumb path "${path}".`);
  }
  return trail.map((item, index) => ({
    name: item.name,
    // Current page: no link (aria-current="page" in the component).
    href: index === trail.length - 1 ? undefined : item.href,
  }));
}

/** BreadcrumbList JSON-LD for a site path. */
export function breadcrumbJsonLdFor(path: string): string {
  const trail = pageTrail(path);
  if (trail.length === 0) {
    throw new Error(`[seo] No registry entry for breadcrumb path "${path}".`);
  }
  return breadcrumbJsonLd(
    trail.map((item) => ({ name: item.name, url: absoluteUrl(item.href) })),
  );
}

/** Crumb display name for a path, e.g. "Powerball Tax Calculator". */
export function crumbNameFor(path: string): string {
  return getPageEntry(path)?.crumbName ?? path;
}

