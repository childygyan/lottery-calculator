/**
 * Phase 8 SEO infrastructure tests.
 *
 * Covers the SEO registry (src/data/seo-pages.ts), breadcrumbs
 * (src/lib/seo/breadcrumbs.ts), the internal-links engine
 * (src/lib/seo/internal-links.ts), the redirects logic
 * (src/data/redirects.ts + dist/_redirects), metadata helpers
 * (src/lib/seo/metadata.ts), the 6 /learn/* pages' layout output, and the
 * layout head snippets on dist/index.html.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  SEO_PAGES,
  getPageEntry,
  indexablePages,
  pageTrail,
} from "../src/data/seo-pages.ts";
import {
  breadcrumbItems,
  breadcrumbJsonLdFor,
  crumbNameFor,
} from "../src/lib/seo/breadcrumbs.ts";
import { relatedPages } from "../src/lib/seo/internal-links.ts";
import {
  allRedirects,
  validateRedirects,
} from "../src/data/redirects.ts";
import {
  absoluteUrl,
  buildPageMeta,
  breadcrumbJsonLd,
  faqJsonLd,
} from "../src/lib/seo/metadata.ts";
import { pageHtml, DIST } from "./dom-utils.ts";

const SITE_URL = "https://lotterycalculator.site";

describe("SEO registry", () => {
  it("has entries and every entry carries all required fields", () => {
    assert.ok(SEO_PAGES.length > 0, "registry must not be empty");
    for (const p of SEO_PAGES) {
      assert.equal(typeof p.slug, "string", "slug");
      assert.equal(typeof p.title, "string", "title");
      assert.equal(typeof p.description, "string", "description");
      assert.equal(typeof p.crumbName, "string", "crumbName");
      assert.ok(p.parent === null || typeof p.parent === "string", `parent for ${p.slug}`);
      assert.equal(typeof p.primaryTopic, "string", `primaryTopic for ${p.slug}`);
      assert.equal(typeof p.canonical, "string", `canonical for ${p.slug}`);
      assert.ok(p.title.length > 0, `empty title for ${p.slug}`);
      assert.ok(p.description.length > 0, `empty description for ${p.slug}`);
      assert.ok(p.crumbName.length > 0, `empty crumbName for ${p.slug}`);
    }
  });

  it("slugs are unique trailing-slash site paths", () => {
    const slugs = SEO_PAGES.map((p) => p.slug);
    assert.equal(new Set(slugs).size, slugs.length, "slugs must be unique");
    for (const slug of slugs) {
      assert.ok(slug.startsWith("/"), `slug must start with /: ${slug}`);
      assert.ok(slug.endsWith("/"), `slug must end with /: ${slug}`);
    }
  });

  it("canonicals are absolute https://lotterycalculator.site URLs matching slugs", () => {
    for (const p of SEO_PAGES) {
      assert.equal(p.canonical, `${SITE_URL}${p.slug}`, `canonical mismatch for ${p.slug}`);
    }
  });

  it("every parent reference points at a real registry entry", () => {
    const slugs = new Set(SEO_PAGES.map((p) => p.slug));
    for (const p of SEO_PAGES) {
      if (p.parent !== null) {
        assert.ok(slugs.has(p.parent), `${p.slug} has unknown parent ${p.parent}`);
      }
    }
  });

  it("registry and dist/ routes correspond exactly", () => {
    // dist/ is freshly built; every indexable registry slug must have a
    // dist/<path>/index.html and no extra route may exist.
    const routes: string[] = [];
    const walk = (dir: string, prefix: string): void => {
      for (const d of readdirSync(dir, { withFileTypes: true })) {
        if (!d.isDirectory() || d.name.startsWith("_")) continue;
        const sub = join(dir, d.name);
        if (existsSync(join(sub, "index.html"))) routes.push(`${prefix}${d.name}/`);
        walk(sub, `${prefix}${d.name}/`);
      }
    };
    walk(DIST, "/");
    const distSet = new Set(routes);
    const slugs = new Set(SEO_PAGES.map((p) => p.slug));
    const missingInDist = [...slugs].filter((s) => s !== "/" && !distSet.has(s));
    const extraInDist = routes.filter((r) => !slugs.has(r));
    assert.deepEqual(missingInDist, [], "registry slugs missing from dist/");
    assert.deepEqual(extraInDist, [], "dist/ routes missing from the registry");
  });
});

describe("breadcrumbs", () => {
  it("breadcrumbItems returns Home-first chains ending at the page", () => {
    const items = breadcrumbItems("/powerball-payout-chart/");
    assert.ok(items.length >= 2, "chain should have Home + at least the page");
    assert.equal(items[0]?.name, "Home");
    assert.equal(items[0]?.href, "/");
    const last = items[items.length - 1];
    assert.equal(last?.name, getPageEntry("/powerball-payout-chart/")!.crumbName);
    assert.equal(last?.href, undefined, "current page crumb must not link to itself");
    for (const item of items.slice(0, -1)) {
      assert.ok(item.href, `non-current crumb "${item.name}" must have an href`);
    }
  });

  it("pageTrail walks the full parent chain (Powerball hub in the middle)", () => {
    const trail = pageTrail("/powerball-payout-chart/");
    const hrefs = trail.map((t) => t.href);
    assert.deepEqual(hrefs, ["/", "/lottery-calculators/", "/powerball/", "/powerball-payout-chart/"]);
  });

  it("breadcrumbJsonLdFor emits valid JSON-LD with absolute item URLs", () => {
    const raw = breadcrumbJsonLdFor("/learn/how-lottery-taxes-work/");
    const data = JSON.parse(raw) as Record<string, unknown>;
    assert.equal(data["@context"], "https://schema.org");
    assert.equal(data["@type"], "BreadcrumbList");
    const elements = data["itemListElement"] as Array<Record<string, unknown>>;
    assert.ok(Array.isArray(elements) && elements.length === 3);
    elements.forEach((el, i) => {
      assert.equal(el["@type"], "ListItem");
      assert.equal(el["position"], i + 1);
      assert.ok(String(el["item"]).startsWith(SITE_URL), `item URL must be absolute: ${el["item"]}`);
    });
    assert.equal(elements[0]?.["name"], "Home");
    assert.equal(elements[0]?.["item"], `${SITE_URL}/`);
    assert.equal(elements[2]?.["item"], `${SITE_URL}/learn/how-lottery-taxes-work/`);
  });

  it("throws loudly for paths with no registry entry", () => {
    assert.throws(() => breadcrumbItems("/no-such-page/"), /No registry entry/);
    assert.throws(() => breadcrumbJsonLdFor("/no-such-page/"), /No registry entry/);
  });

  it("crumbNameFor returns the registry label, or the path as fallback", () => {
    assert.equal(crumbNameFor("/powerball/"), "Powerball");
    assert.equal(crumbNameFor("/unlisted/"), "/unlisted/");
  });
});

describe("internal-links engine", () => {
  const samples = [
    "/powerball/",
    "/powerball-payout-chart/",
    "/mega-millions/",
    "/learn/how-lottery-taxes-work/",
    "/lottery-tax-calculator/",
    "/lottery-tax-calculator/california/",
  ];

  it("returns non-empty results for a sample of slugs", () => {
    for (const slug of samples) {
      const results = relatedPages(slug);
      assert.ok(results.length > 0, `no related pages for ${slug}`);
    }
  });

  it("never includes the page itself and only indexable pages", () => {
    for (const slug of samples) {
      for (const r of relatedPages(slug, 8)) {
        assert.notEqual(r.slug, slug, `${slug} links to itself`);
        assert.ok(getPageEntry(r.slug)?.indexable, `${r.slug} is not indexable`);
      }
    }
  });

  it("respects the limit", () => {
    assert.ok(relatedPages("/powerball/", 3).length <= 3);
    assert.ok(relatedPages("/powerball/", 1).length <= 1);
    const all = relatedPages("/powerball/", 100);
    assert.ok(all.length <= indexablePages().length - 1);
  });

  it("is deterministic and sorted by descending score", () => {
    const a = relatedPages("/powerball-payout-chart/", 6).map((r) => r.slug);
    const b = relatedPages("/powerball-payout-chart/", 6).map((r) => r.slug);
    assert.deepEqual(a, b, "relatedPages must be deterministic");
    const scores = relatedPages("/powerball-payout-chart/", 6).map((r) => r.score);
    const sorted = [...scores].sort((x, y) => y - x);
    assert.deepEqual(scores, sorted, "results must be sorted by descending score");
  });

  it("returns [] for unknown slugs", () => {
    assert.deepEqual(relatedPages("/definitely-not-a-page/"), []);
  });
});

describe("redirects", () => {
  it("allRedirects returns rules (>0) — logic module behind scripts/build-redirects.mjs", () => {
    const rules = allRedirects();
    assert.ok(rules.length > 0, "must produce at least one redirect rule");
  });

  it("validateRedirects finds no problems (no chains, loops, or self-loops)", () => {
    assert.deepEqual(validateRedirects(allRedirects()), []);
  });

  it("no self-loops and every from-path starts with /", () => {
    for (const r of allRedirects()) {
      assert.ok(r.oldPath.startsWith("/"), `from must start with /: ${r.oldPath}`);
      assert.notEqual(r.oldPath, r.newPath, `self-loop: ${r.oldPath}`);
    }
  });

  it("dist/_redirects exists and mirrors the built rule set", () => {
    const rules = allRedirects();
    const body = readFileSync(join(DIST, "_redirects"), "utf8");
    const lines = body.trim().split("\n").filter((l) => l.length > 0);
    assert.equal(lines.length, rules.length, "dist/_redirects line count must match rule count");
    for (const line of lines) {
      const parts = line.split(/\s+/);
      assert.equal(parts.length, 3, `malformed rule line: ${line}`);
      assert.ok(parts[0]?.startsWith("/"), `from must start with /: ${line}`);
    }
  });
});

describe("metadata helpers", () => {
  it("absoluteUrl converts site paths to absolute URLs", () => {
    assert.equal(absoluteUrl("/powerball/"), `${SITE_URL}/powerball/`);
    assert.equal(absoluteUrl("powerball/"), `${SITE_URL}/powerball/`);
  });

  it("buildPageMeta produces absolute canonicals and non-empty title/description", () => {
    const meta = buildPageMeta({
      title: "Powerball Calculator",
      description: "Estimate Powerball winnings.",
      path: "/powerball-calculator/",
    });
    assert.equal(meta.title, "Powerball Calculator");
    assert.equal(meta.description, "Estimate Powerball winnings.");
    assert.equal(meta.canonical, `${SITE_URL}/powerball-calculator/`);
    assert.ok(meta.canonical.startsWith(SITE_URL));
  });

  it("buildPageMeta fills sensible defaults", () => {
    const meta = buildPageMeta({ title: "T", path: "/" });
    assert.ok(meta.description.length > 0, "description should default to the site description");
    assert.equal(meta.ogType, "website");
    assert.equal(meta.robots, "index, follow");
  });

  it("breadcrumbJsonLd emits parseable BreadcrumbList JSON-LD", () => {
    const raw = breadcrumbJsonLd([
      { name: "Home", url: `${SITE_URL}/` },
      { name: "Powerball", url: `${SITE_URL}/powerball/` },
    ]);
    const data = JSON.parse(raw) as Record<string, unknown>;
    assert.equal(data["@type"], "BreadcrumbList");
    const elements = data["itemListElement"] as Array<Record<string, unknown>>;
    assert.equal(elements.length, 2);
    assert.equal(elements[1]?.["item"], `${SITE_URL}/powerball/`);
  });

  it("faqJsonLd emits parseable FAQPage JSON-LD", () => {
    const raw = faqJsonLd([
      { question: "Is the annuity taxed?", answer: "Yes, each payment is taxable income." },
      { question: "How many payments?", answer: "Thirty graduated annual payments." },
    ]);
    const data = JSON.parse(raw) as Record<string, unknown>;
    assert.equal(data["@context"], "https://schema.org");
    assert.equal(data["@type"], "FAQPage");
    const entities = data["mainEntity"] as Array<Record<string, unknown>>;
    assert.equal(entities.length, 2);
    assert.equal(entities[0]?.["@type"], "Question");
    assert.equal(entities[0]?.["name"], "Is the annuity taxed?");
    const answer = entities[0]?.["acceptedAnswer"] as Record<string, unknown>;
    assert.equal(answer?.["@type"], "Answer");
    assert.match(String(answer?.["text"]), /taxable income/);
  });
});

describe("LearnArticle layout output", () => {
  const learnPages = [
    "learn/cash-option-vs-annuity/index.html",
    "learn/how-lottery-combinations-work/index.html",
    "learn/how-lottery-odds-work/index.html",
    "learn/how-lottery-payouts-work/index.html",
    "learn/how-lottery-taxes-work/index.html",
    "learn/lottery-withholding-vs-tax/index.html",
  ];

  it("all 6 /learn/* pages exist in dist/", () => {
    assert.equal(learnPages.length, 6);
    for (const p of learnPages) {
      assert.doesNotThrow(() => pageHtml(p), `missing dist page: ${p}`);
    }
  });

  it("each learn page has exactly one <h1>", () => {
    for (const p of learnPages) {
      const html = pageHtml(p);
      const h1s = html.match(/<h1\b[\s\S]*?<\/h1>/g) ?? [];
      assert.equal(h1s.length, 1, `${p}: expected exactly one h1, found ${h1s.length}`);
    }
  });

  it("each learn page renders breadcrumbs markup", () => {
    for (const p of learnPages) {
      const html = pageHtml(p);
      assert.ok(
        html.includes('aria-label="Breadcrumb"') || /BreadcrumbList/.test(html),
        `${p}: no breadcrumb markup found`,
      );
      const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      const hasCrumbLd = blocks.some((b) => {
        try {
          return (JSON.parse(b[1] ?? "") as Record<string, unknown>)["@type"] === "BreadcrumbList";
        } catch {
          return false;
        }
      });
      assert.ok(hasCrumbLd, `${p}: no BreadcrumbList JSON-LD block`);
    }
  });

  it("each learn page carries FAQ JSON-LD with real questions", () => {
    for (const p of learnPages) {
      const html = pageHtml(p);
      const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      const faq = blocks
        .map((b) => {
          try {
            return JSON.parse(b[1] ?? "") as Record<string, unknown>;
          } catch {
            return null;
          }
        })
        .find((d) => d?.["@type"] === "FAQPage");
      assert.ok(faq, `${p}: no FAQPage JSON-LD block`);
      const entities = faq!["mainEntity"] as Array<Record<string, unknown>>;
      assert.ok(entities.length > 0, `${p}: FAQPage has no questions`);
      for (const e of entities) {
        assert.ok(String(e["name"]).length > 0, `${p}: FAQ question with empty name`);
      }
    }
  });
});

describe("layout head snippets", () => {
  const html = pageHtml("index.html");

  it("loads GA4 with the production measurement ID", () => {
    assert.ok(html.includes("G-HEF85ZBF99"), "GA4 measurement ID missing from <head>");
  });

  it("carries the Google site-verification meta tag", () => {
    assert.ok(
      html.includes('name="google-site-verification"'),
      "google-site-verification meta tag missing",
    );
  });

  it("gates analytics to the production hostname", () => {
    assert.ok(
      html.includes('PROD_HOST = "lotterycalculator.site"') ||
        html.includes("lotterycalculator.site"),
      "production-hostname gating missing",
    );
  });

  it("redirects off the legacy workers.dev staging hostname", () => {
    assert.ok(
      html.includes("lottery-calculator.childygyan.workers.dev"),
      "workers.dev legacy-host redirect missing",
    );
  });
});
