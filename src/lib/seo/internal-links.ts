/**
 * Internal linking engine.
 *
 * relatedPages() scores every indexable page against the current page by
 * page type, lottery, state, topic, and search intent — then returns the
 * top matches. Rules:
 *
 * - Never links to the page itself or to non-indexable pages.
 * - Same-lottery pages score highest (Powerball pages link to Powerball pages).
 * - Parent/child (hub) relationships score high: hubs push authority down,
 *   deep pages link back up.
 * - Same-intent pages are demoted: two pages must not compete for the same
 *   purpose, so the engine prefers complementary tools (tax -> payout,
 *   odds -> number generator) over near-duplicates.
 * - Shared topics add weight; scoring is fully deterministic (slug tiebreak).
 */
import {
  SEO_PAGES,
  getPageEntry,
  type SEOPageEntry,
} from "../../data/seo-pages.ts";

export interface RelatedPage {
  slug: string;
  crumbName: string;
  title: string;
  description: string;
  intent: SEOPageEntry["intent"];
  lottery?: "powerball" | "mega-millions";
  score: number;
}

function scoreCandidate(current: SEOPageEntry, candidate: SEOPageEntry): number {
  if (candidate.slug === current.slug || !candidate.indexable) return -Infinity;
  let score = 0;

  // Same lottery family: the strongest affinity signal.
  if (current.lottery && candidate.lottery === current.lottery) score += 50;
  // Cross-lottery sibling (Powerball <-> Mega Millions) is still relevant.
  if (current.lottery && candidate.lottery && candidate.lottery !== current.lottery) score += 12;

  // Hub relationships: parent <-> child both directions.
  if (candidate.slug === current.parent) score += 40;
  if (candidate.parent === current.slug) score += 35;
  // Sibling pages under the same parent.
  if (current.parent && candidate.parent === current.parent) score += 20;

  // Intent: prefer complementary tools over same-purpose pages.
  if (candidate.intent === current.intent) {
    // Same intent is only useful across lotteries (PB tax vs MM tax).
    score += candidate.lottery && candidate.lottery !== current.lottery ? 8 : -25;
  } else {
    score += 10;
  }

  // Topic overlap.
  if (candidate.primaryTopic === current.primaryTopic) score += 25;
  const shared = candidate.relatedTopics.filter(
    (t) => t === current.primaryTopic || current.relatedTopics.includes(t),
  );
  score += Math.min(shared.length * 8, 24);

  // Hubs are good link targets: they distribute authority.
  if (candidate.pageType === "hub") score += 6;
  // Informational pages (methodology, disclaimer) are weak related targets.
  if (candidate.pageType === "info") score -= 10;

  return score;
}

/**
 * Top related pages for a slug, ordered by relevance score.
 * Deterministic: ties break on slug.
 */
export function relatedPages(slug: string, limit = 6): RelatedPage[] {
  const current = getPageEntry(slug);
  if (!current) return [];
  return SEO_PAGES.map((candidate) => ({
    slug: candidate.slug,
    crumbName: candidate.crumbName,
    title: candidate.title,
    description: candidate.description,
    intent: candidate.intent,
    lottery: candidate.lottery,
    score: scoreCandidate(current, candidate),
  }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score || (a.slug < b.slug ? -1 : 1))
    .slice(0, limit);
}

/**
 * Incoming-link audit helper: every indexable page that links to `slug`
 * through this engine (plus its breadcrumb parent chain).
 */
export function incomingLinks(slug: string): string[] {
  const incoming: string[] = [];
  for (const page of SEO_PAGES) {
    if (!page.indexable || page.slug === slug) continue;
    if (relatedPages(page.slug, 8).some((r) => r.slug === slug)) {
      incoming.push(page.slug);
    }
  }
  return incoming;
}
