/**
 * SEO page registry — the central inventory of every indexable route.
 *
 * Each entry declares the page's primary search intent, its topic family,
 * its breadcrumb parent, and its sitemap priority. Two systems read this
 * registry:
 *
 * - src/lib/seo/breadcrumbs.ts builds visible breadcrumbs + JSON-LD from
 *   the parent chain, so no page hand-writes its own trail.
 * - src/lib/seo/internal-links.ts scores related pages by intent, lottery,
 *   state, and topic, powering RelatedCalculators.astro.
 *
 * Programmatic routes (51 state pages, 5 amount pages) are expanded from
 * the same data modules the routes themselves use, so the registry can
 * never drift out of sync with getStaticPaths().
 */

import { absoluteUrl } from "../lib/seo/metadata.ts";
import { getStatePageContexts, getStateTaxRules } from "./taxes/index.ts";
import { getStatePageContent } from "./states/index.ts";
import { getAllJackpotAmounts } from "./jackpots.ts";
import { DEFAULT_TAX_YEAR } from "./taxes/federal/index.ts";

/** One primary search intent per page — no page may claim two. */
export type SEOPageIntent =
  | "calculator"
  | "tax"
  | "payout"
  | "annuity"
  | "cash-option"
  | "odds"
  | "probability"
  | "generator"
  | "combination"
  | "state"
  | "game"
  | "educational"
  | "hub"
  | "amount"
  | "info";

export type SEOPageType =
  | "calculator"
  | "hub"
  | "state"
  | "amount"
  | "learn"
  | "game"
  | "info";

export interface SEOPageEntry {
  /** Trailing-slash site path, e.g. "/lottery-calculator/". */
  slug: string;
  pageType: SEOPageType;
  /** Exactly one primary search intent per page. */
  intent: SEOPageIntent;
  title: string;
  description: string;
  /** Short label used in breadcrumbs and related-page cards. */
  crumbName: string;
  /** Slug of the breadcrumb parent, or null for the homepage. */
  parent: string | null;
  primaryTopic: string;
  relatedTopics: string[];
  canonical: string;
  indexable: boolean;
  /** Sitemap priority hint, 0.0–1.0. */
  priority: number;
  lottery?: "powerball" | "mega-millions";
  state?: string;
}

type StaticDef = Omit<SEOPageEntry, "canonical">;

function entry(def: StaticDef): SEOPageEntry {
  return { ...def, canonical: absoluteUrl(def.slug) };
}

/* ------------------------------------------------------------------ */
/* Static routes                                                       */
/* ------------------------------------------------------------------ */

const STATIC_PAGES: SEOPageEntry[] = [
  entry({
    slug: "/",
    pageType: "hub",
    intent: "hub",
    title: "Lottery Calculator — Estimate Winnings, Taxes & Take-Home",
    description:
      "Calculate estimated lottery winnings, taxes, payouts, and take-home amounts with easy-to-use lottery calculators.",
    crumbName: "Home",
    parent: null,
    primaryTopic: "lottery-calculator",
    relatedTopics: ["lottery-tax", "payout", "odds", "powerball", "mega-millions", "number-generator"],
    indexable: true,
    priority: 1.0,
  }),
  entry({
    slug: "/lottery-calculators/",
    pageType: "hub",
    intent: "hub",
    title: "Lottery Calculators — Every Tool in One Place",
    description:
      "Browse every lottery calculator: winnings, taxes, payouts, annuities, cash option, odds, probability, and number generators for Powerball and Mega Millions.",
    crumbName: "Lottery Calculators",
    parent: "/",
    primaryTopic: "lottery-calculator",
    relatedTopics: ["lottery-tax", "payout", "annuity", "cash-option", "odds", "probability", "number-generator"],
    indexable: true,
    priority: 0.9,
  }),
  entry({
    slug: "/lottery-calculator/",
    pageType: "calculator",
    intent: "calculator",
    title: "Lottery Winnings Calculator — Estimate Taxes & Take-Home Pay",
    description:
      "Estimate federal and state taxes on lottery winnings. Enter the jackpot, cash option, tax year, filing status, and your state to see estimated take-home amounts.",
    crumbName: "Lottery Calculator",
    parent: "/lottery-calculators/",
    primaryTopic: "lottery-calculator",
    relatedTopics: ["lottery-tax", "payout", "state-tax", "withholding"],
    indexable: true,
    priority: 0.9,
  }),
  entry({
    slug: "/lottery-tax-calculator/",
    pageType: "calculator",
    intent: "tax",
    title: "Lottery Tax Calculator — Estimate Federal & State Tax on Winnings",
    description:
      "Estimate federal and state taxes on lottery winnings for all 50 states plus DC. See take-home amounts for lump sum or annuity payouts with 2026 rates.",
    crumbName: "Lottery Tax Calculator",
    parent: "/lottery-calculators/",
    primaryTopic: "lottery-tax",
    relatedTopics: ["state-tax", "withholding", "lottery-calculator", "payout"],
    indexable: true,
    priority: 0.9,
  }),
  entry({
    slug: "/lottery-payout-calculator/",
    pageType: "calculator",
    intent: "payout",
    title: "Lottery Payout Calculator — Cash vs Annuity Comparison",
    description:
      "Compare the lottery cash option against annuity payments. Estimate taxes, timing, and take-home for both payout choices side by side.",
    crumbName: "Lottery Payout Calculator",
    parent: "/lottery-calculators/",
    primaryTopic: "payout",
    relatedTopics: ["annuity", "cash-option", "lottery-tax", "jackpot-amounts"],
    indexable: true,
    priority: 0.9,
  }),
  entry({
    slug: "/lottery-annuity-calculator/",
    pageType: "calculator",
    intent: "annuity",
    title: "Lottery Annuity Calculator — Build a Payment Schedule",
    description:
      "Build an illustrative lottery annuity payment schedule. Enter the total, number of payments, frequency, and annual increase to see each payment and the running total.",
    crumbName: "Lottery Annuity Calculator",
    parent: "/lottery-calculators/",
    primaryTopic: "annuity",
    relatedTopics: ["payout", "cash-option", "lottery-tax"],
    indexable: true,
    priority: 0.8,
  }),
  entry({
    slug: "/lottery-cash-option-calculator/",
    pageType: "calculator",
    intent: "cash-option",
    title: "Lottery Cash Option Calculator — Lump Sum Taxes & Take-Home",
    description:
      "Estimate taxes on the lottery cash option. Enter the official lump-sum cash value to see federal and state tax estimates, withholding, and your take-home amount.",
    crumbName: "Lottery Cash Option Calculator",
    parent: "/lottery-calculators/",
    primaryTopic: "cash-option",
    relatedTopics: ["payout", "annuity", "lottery-tax"],
    indexable: true,
    priority: 0.8,
  }),
  entry({
    slug: "/lottery-odds-calculator/",
    pageType: "calculator",
    intent: "odds",
    title: "Lottery Odds Calculator — Calculate Your Chances",
    description:
      "Calculate lottery odds, probabilities, combinations, ticket costs, and your chance of at least one win.",
    crumbName: "Lottery Odds Calculator",
    parent: "/lottery-calculators/",
    primaryTopic: "odds",
    relatedTopics: ["probability", "combinations", "powerball", "mega-millions"],
    indexable: true,
    priority: 0.8,
  }),
  entry({
    slug: "/lottery-probability-calculator/",
    pageType: "calculator",
    intent: "probability",
    title: "Lottery Probability Calculator — Chance of Winning With Multiple Tickets",
    description:
      "Calculate the probability of at least one lottery jackpot win with 1, 10, 100, or 1,000+ tickets. Compare Powerball, Mega Millions, or custom odds.",
    crumbName: "Lottery Probability Calculator",
    parent: "/lottery-calculators/",
    primaryTopic: "probability",
    relatedTopics: ["odds", "combinations", "powerball", "mega-millions"],
    indexable: true,
    priority: 0.8,
  }),
  entry({
    slug: "/lottery-number-generator/",
    pageType: "calculator",
    intent: "generator",
    title: "Lottery Number Generator — Random Number Sets",
    description:
      "Generate random lottery number sets for any game: custom number pools, bonus balls, 1–100 sets, no duplicates. Free, private, runs in your browser.",
    crumbName: "Lottery Number Generator",
    parent: "/lottery-calculators/",
    primaryTopic: "number-generator",
    relatedTopics: ["odds", "powerball", "mega-millions", "combinations"],
    indexable: true,
    priority: 0.8,
  }),
  entry({
    slug: "/lottery-combination-generator/",
    pageType: "calculator",
    intent: "combination",
    title: "Lottery Combination Generator — Count Possible Combinations",
    description:
      "Count the distinct combinations any lottery's rules allow: main pools, bonus balls, jackpot odds, and the illustrative cost of full coverage.",
    crumbName: "Lottery Combination Generator",
    parent: "/lottery-calculators/",
    primaryTopic: "combinations",
    relatedTopics: ["odds", "probability", "number-generator"],
    indexable: true,
    priority: 0.7,
  }),

  /* ---------------- Powerball cluster ---------------- */
  entry({
    slug: "/powerball/",
    pageType: "hub",
    intent: "hub",
    title: "Powerball — Calculators, Odds, Taxes & Rules",
    description:
      "Everything Powerball in one place: tax and winnings calculators, odds, payout comparison, and number generator, with verified game rules and sources.",
    crumbName: "Powerball",
    parent: "/lottery-calculators/",
    primaryTopic: "powerball",
    relatedTopics: ["lottery-tax", "odds", "payout", "number-generator", "mega-millions"],
    indexable: true,
    priority: 0.9,
    lottery: "powerball",
  }),
  entry({
    slug: "/powerball-calculator/",
    pageType: "game",
    intent: "game",
    title: "Powerball Calculator — Estimate Taxes & Take-Home Winnings",
    description:
      "Estimate Powerball taxes and take-home winnings for any jackpot. Enter the advertised jackpot and cash value for federal and state tax estimates using 2026 rates.",
    crumbName: "Powerball Calculator",
    parent: "/powerball/",
    primaryTopic: "powerball",
    relatedTopics: ["lottery-tax", "payout", "odds", "state-tax"],
    indexable: true,
    priority: 0.9,
    lottery: "powerball",
  }),
  entry({
    slug: "/powerball-tax-calculator/",
    pageType: "game",
    intent: "tax",
    title: "Powerball Tax Calculator — Federal & State Tax on Winnings",
    description:
      "Estimate federal and state taxes on a Powerball win. Enter the jackpot and cash value, pick your state, tax year, and filing status.",
    crumbName: "Powerball Tax Calculator",
    parent: "/powerball/",
    primaryTopic: "powerball",
    relatedTopics: ["lottery-tax", "state-tax", "withholding", "payout"],
    indexable: true,
    priority: 0.9,
    lottery: "powerball",
  }),
  entry({
    slug: "/powerball-payout-calculator/",
    pageType: "game",
    intent: "payout",
    title: "Powerball Payout Calculator — Cash vs Annuity",
    description:
      "Compare Powerball's cash option against its 30 graduated annuity payments. Estimate taxes and take-home for both payout choices side by side.",
    crumbName: "Powerball Payout Calculator",
    parent: "/powerball/",
    primaryTopic: "powerball",
    relatedTopics: ["payout", "annuity", "cash-option", "lottery-tax"],
    indexable: true,
    priority: 0.8,
    lottery: "powerball",
  }),
  entry({
    slug: "/powerball-odds-calculator/",
    pageType: "game",
    intent: "odds",
    title: "Powerball Odds Calculator — Calculate Your Winning Chances",
    description:
      "Calculate Powerball odds for every prize tier: 5/69 + 1/26, 1 in 292,201,338 jackpot odds, and your chance with multiple tickets.",
    crumbName: "Powerball Odds Calculator",
    parent: "/powerball/",
    primaryTopic: "powerball",
    relatedTopics: ["odds", "probability", "combinations", "number-generator"],
    indexable: true,
    priority: 0.8,
    lottery: "powerball",
  }),
  entry({
    slug: "/powerball-number-generator/",
    pageType: "game",
    intent: "generator",
    title: "Powerball Number Generator — Random Powerball Picks",
    description:
      "Generate random Powerball number sets: 5 numbers from 1–69 plus a Powerball from 1–26. Free, private, runs in your browser.",
    crumbName: "Powerball Number Generator",
    parent: "/powerball/",
    primaryTopic: "powerball",
    relatedTopics: ["number-generator", "odds", "mega-millions"],
    indexable: true,
    priority: 0.8,
    lottery: "powerball",
  }),
  entry({
    slug: "/powerball-payout-chart/",
    pageType: "game",
    intent: "educational",
    title: "Powerball Payout Chart — All 9 Prize Tiers, Prizes & Odds",
    description:
      "The complete Powerball payout chart: all 9 prize tiers with match requirements, prize amounts, and odds — plus Power Play multiplier details.",
    crumbName: "Powerball Payout Chart",
    parent: "/powerball/",
    primaryTopic: "powerball",
    relatedTopics: ["payout", "odds", "lottery-tax", "cash-option"],
    indexable: true,
    priority: 0.8,
    lottery: "powerball",
  }),
  entry({
    slug: "/powerball-jackpot-analysis/",
    pageType: "game",
    intent: "educational",
    title: "Powerball Jackpot Analysis — How to Analyze Any Jackpot",
    description:
      "How to analyze a Powerball jackpot: cash value vs annuity, tax estimates, odds, and expected value — an honest framework, not hype.",
    crumbName: "Powerball Jackpot Analysis",
    parent: "/powerball/",
    primaryTopic: "powerball",
    relatedTopics: ["payout", "annuity", "cash-option", "lottery-tax", "odds"],
    indexable: true,
    priority: 0.8,
    lottery: "powerball",
  }),
  entry({
    slug: "/powerball-annuity-calculator/",
    pageType: "game",
    intent: "annuity",
    title: "Powerball Annuity Calculator — 30 Payments Schedule",
    description:
      "Calculate Powerball's 30 graduated annuity payments over 29 years. Enter the jackpot and annual increase to see each yearly payment.",
    crumbName: "Powerball Annuity Calculator",
    parent: "/powerball/",
    primaryTopic: "powerball",
    relatedTopics: ["annuity", "payout", "cash-option", "lottery-tax"],
    indexable: true,
    priority: 0.8,
    lottery: "powerball",
  }),

  /* ---------------- Mega Millions cluster ---------------- */
  entry({
    slug: "/mega-millions/",
    pageType: "hub",
    intent: "hub",
    title: "Mega Millions — Calculators, Odds, Taxes & Rules",
    description:
      "Everything Mega Millions in one place: tax and winnings calculators, odds, payout comparison, and number generator, with verified game rules and sources.",
    crumbName: "Mega Millions",
    parent: "/lottery-calculators/",
    primaryTopic: "mega-millions",
    relatedTopics: ["lottery-tax", "odds", "payout", "number-generator", "powerball"],
    indexable: true,
    priority: 0.9,
    lottery: "mega-millions",
  }),
  entry({
    slug: "/mega-millions-calculator/",
    pageType: "game",
    intent: "game",
    title: "Mega Millions Calculator — Estimate Taxes & Take-Home Winnings",
    description:
      "Estimate Mega Millions taxes and take-home winnings for any jackpot. Enter the advertised jackpot and cash value for federal and state tax estimates using 2026 rates.",
    crumbName: "Mega Millions Calculator",
    parent: "/mega-millions/",
    primaryTopic: "mega-millions",
    relatedTopics: ["lottery-tax", "payout", "odds", "state-tax"],
    indexable: true,
    priority: 0.9,
    lottery: "mega-millions",
  }),
  entry({
    slug: "/mega-millions-tax-calculator/",
    pageType: "game",
    intent: "tax",
    title: "Mega Millions Tax Calculator — Federal & State Tax on Winnings",
    description:
      "Estimate federal and state taxes on a Mega Millions win. Enter the jackpot and cash value, pick your state, tax year, and filing status.",
    crumbName: "Mega Millions Tax Calculator",
    parent: "/mega-millions/",
    primaryTopic: "mega-millions",
    relatedTopics: ["lottery-tax", "state-tax", "withholding", "payout"],
    indexable: true,
    priority: 0.9,
    lottery: "mega-millions",
  }),
  entry({
    slug: "/mega-millions-payout-calculator/",
    pageType: "game",
    intent: "payout",
    title: "Mega Millions Payout Calculator — Cash vs Annuity",
    description:
      "Compare Mega Millions' cash option against its 30 annual payments growing 5% per year. Estimate taxes and take-home for both payout choices side by side.",
    crumbName: "Mega Millions Payout Calculator",
    parent: "/mega-millions/",
    primaryTopic: "mega-millions",
    relatedTopics: ["payout", "annuity", "cash-option", "lottery-tax"],
    indexable: true,
    priority: 0.8,
    lottery: "mega-millions",
  }),
  entry({
    slug: "/mega-millions-odds-calculator/",
    pageType: "game",
    intent: "odds",
    title: "Mega Millions Odds Calculator — Calculate Your Winning Chances",
    description:
      "Calculate Mega Millions odds for every prize tier: 5/70 + 1/24, 1 in 290,472,336 jackpot odds, and your chance with multiple tickets.",
    crumbName: "Mega Millions Odds Calculator",
    parent: "/mega-millions/",
    primaryTopic: "mega-millions",
    relatedTopics: ["odds", "probability", "combinations", "number-generator"],
    indexable: true,
    priority: 0.8,
    lottery: "mega-millions",
  }),
  entry({
    slug: "/mega-millions-number-generator/",
    pageType: "game",
    intent: "generator",
    title: "Mega Millions Number Generator — Random Mega Millions Picks",
    description:
      "Generate random Mega Millions number sets: 5 numbers from 1–70 plus a Mega Ball from 1–24. Free, private, runs in your browser.",
    crumbName: "Mega Millions Number Generator",
    parent: "/mega-millions/",
    primaryTopic: "mega-millions",
    relatedTopics: ["number-generator", "odds", "powerball"],
    indexable: true,
    priority: 0.8,
    lottery: "mega-millions",
  }),

  /* ---------------- Learn hub ---------------- */
  entry({
    slug: "/learn/",
    pageType: "hub",
    intent: "hub",
    title: "Learn — Lottery Taxes, Payouts & Odds Explained",
    description:
      "Plain-English guides to how lottery taxes, withholding, cash vs annuity payouts, odds, and combinations actually work — each linked to the calculator that applies it.",
    crumbName: "Learn",
    parent: "/",
    primaryTopic: "education",
    relatedTopics: ["lottery-tax", "payout", "odds", "withholding", "annuity"],
    indexable: true,
    priority: 0.8,
  }),
  entry({
    slug: "/methodology/",
    pageType: "info",
    intent: "info",
    title: "Methodology — How Our Lottery Calculators Work",
    description:
      "What the lottery calculators compute, the assumptions behind every estimate, how tax data and game rules are sourced, and when each was last verified.",
    crumbName: "Methodology",
    parent: "/",
    primaryTopic: "education",
    relatedTopics: ["lottery-tax", "odds", "payout"],
    indexable: true,
    priority: 0.7,
  }),

  /* ---------------- Informational pages ---------------- */
  entry({
    slug: "/about/",
    pageType: "info",
    intent: "info",
    title: "About — Lottery Calculator",
    description:
      "Learn what Lottery Calculator is, how its estimates work, and why every figure is clearly labeled as an estimate.",
    crumbName: "About",
    parent: "/",
    primaryTopic: "lottery-calculator",
    relatedTopics: ["education"],
    indexable: true,
    priority: 0.5,
  }),
  entry({
    slug: "/contact/",
    pageType: "info",
    intent: "info",
    title: "Contact — Lottery Calculator",
    description:
      "Contact the Lottery Calculator team with questions, corrections, or feedback about our lottery calculators.",
    crumbName: "Contact",
    parent: "/",
    primaryTopic: "lottery-calculator",
    relatedTopics: [],
    indexable: true,
    priority: 0.4,
  }),
  entry({
    slug: "/privacy/",
    pageType: "info",
    intent: "info",
    title: "Privacy Policy — Lottery Calculator",
    description:
      "How Lottery Calculator handles your information: calculations run in your browser and we collect no personal data.",
    crumbName: "Privacy",
    parent: "/",
    primaryTopic: "lottery-calculator",
    relatedTopics: [],
    indexable: true,
    priority: 0.3,
  }),
  entry({
    slug: "/terms/",
    pageType: "info",
    intent: "info",
    title: "Terms of Use — Lottery Calculator",
    description:
      "The terms for using Lottery Calculator's free estimation tools.",
    crumbName: "Terms",
    parent: "/",
    primaryTopic: "lottery-calculator",
    relatedTopics: [],
    indexable: true,
    priority: 0.3,
  }),
  entry({
    slug: "/disclaimer/",
    pageType: "info",
    intent: "info",
    title: "Disclaimer — Lottery Calculator",
    description:
      "Calculator results are estimates for informational purposes only. Lottery Calculator does not provide tax or financial advice.",
    crumbName: "Disclaimer",
    parent: "/",
    primaryTopic: "lottery-calculator",
    relatedTopics: ["education"],
    indexable: true,
    priority: 0.3,
  }),
];

/* ------------------------------------------------------------------ */
/* Programmatic routes: expanded from the same data as getStaticPaths  */
/* ------------------------------------------------------------------ */

const ALL_STATE_RULES = getStateTaxRules(DEFAULT_TAX_YEAR);
const STATE_PAGES: SEOPageEntry[] = getStatePageContexts(DEFAULT_TAX_YEAR).map(({ rule }) => {
  const content = getStatePageContent(rule, ALL_STATE_RULES);
  if (!content) {
    throw new Error(`[seo] No state page content template for ${rule.code}`);
  }
  return entry({
    slug: `/lottery-tax-calculator/${rule.slug}/`,
    pageType: "state",
    intent: "state",
    title: `${rule.name} Lottery Tax Calculator — Estimate Your Take-Home Winnings`,
    description: content.metaDescription,
    crumbName: rule.name,
    parent: "/lottery-tax-calculator/",
    primaryTopic: "state-tax",
    relatedTopics: ["lottery-tax", "withholding", "payout", rule.code === "CA" ? "education" : "annuity"],
    indexable: true,
    priority: 0.8,
    state: rule.code,
  });
});

const AMOUNT_PAGES: SEOPageEntry[] = getAllJackpotAmounts().map((amount) => {
  return entry({
    slug: `/lottery-payout-calculator/${amount.slug}/`,
    pageType: "amount",
    intent: "amount",
    title: amount.title,
    description: amount.description,
    crumbName: amount.label,
    parent: "/lottery-payout-calculator/",
    primaryTopic: "jackpot-amounts",
    relatedTopics: ["payout", "annuity", "cash-option", "lottery-tax"],
    indexable: true,
    priority: 0.7,
  });
});

/* ------------------------------------------------------------------ */
/* Learn articles — registered centrally so the linking engine,        */
/* breadcrumbs, and audits know about them before they are built.      */
/* ------------------------------------------------------------------ */

export interface LearnArticleDef {
  slug: string;
  title: string;
  description: string;
  crumbName: string;
  primaryTopic: string;
  relatedTopics: string[];
}

export const LEARN_ARTICLES: LearnArticleDef[] = [
  {
    slug: "/learn/how-lottery-taxes-work/",
    title: "How Lottery Taxes Work — Federal & State Tax on Winnings",
    description:
      "Lottery winnings are taxed as ordinary income. Learn how federal brackets, state taxes, and filing status shape what a winner actually keeps.",
    crumbName: "How Lottery Taxes Work",
    primaryTopic: "lottery-tax",
    relatedTopics: ["state-tax", "withholding", "payout"],
  },
  {
    slug: "/learn/cash-option-vs-annuity/",
    title: "Cash Option vs Annuity — How Lottery Payouts Compare",
    description:
      "The advertised jackpot is the annuity total; the cash option is its present value. Understand the trade-offs before choosing a payout.",
    crumbName: "Cash Option vs Annuity",
    primaryTopic: "payout",
    relatedTopics: ["annuity", "cash-option", "lottery-tax"],
  },
  {
    slug: "/learn/how-lottery-odds-work/",
    title: "How Lottery Odds Work — Combinations & Probability",
    description:
      "Lottery odds come from counting combinations. See how 5/69 + 1/26 becomes 1 in 292,201,338, and what extra tickets actually change.",
    crumbName: "How Lottery Odds Work",
    primaryTopic: "odds",
    relatedTopics: ["probability", "combinations", "number-generator"],
  },
  {
    slug: "/learn/how-lottery-payouts-work/",
    title: "How Lottery Payouts Work — From Drawing to Money in Hand",
    description:
      "What happens after you win: claiming, the cash-vs-annuity choice, withholding at payout, and when the rest of the tax bill arrives.",
    crumbName: "How Lottery Payouts Work",
    primaryTopic: "payout",
    relatedTopics: ["withholding", "lottery-tax", "annuity"],
  },
  {
    slug: "/learn/lottery-withholding-vs-tax/",
    title: "Lottery Withholding vs Tax — Why 24% Isn't the Final Bill",
    description:
      "Federal law requires 24% withholding on lottery winnings over $5,000 — but withholding is a prepayment, not your final tax. Learn the difference.",
    crumbName: "Lottery Withholding vs Tax",
    primaryTopic: "withholding",
    relatedTopics: ["lottery-tax", "state-tax", "payout"],
  },
  {
    slug: "/learn/how-lottery-combinations-work/",
    title: "How Lottery Combinations Work — Counting Every Possible Ticket",
    description:
      "Every lottery ticket is one combination out of millions. Learn how combinations are counted and why full coverage costs more than the jackpot.",
    crumbName: "How Lottery Combinations Work",
    primaryTopic: "combinations",
    relatedTopics: ["odds", "probability", "number-generator"],
  },
];

const LEARN_PAGES: SEOPageEntry[] = LEARN_ARTICLES.map((a) =>
  entry({
    slug: a.slug,
    pageType: "learn",
    intent: "educational",
    title: a.title,
    description: a.description,
    crumbName: a.crumbName,
    parent: "/learn/",
    primaryTopic: a.primaryTopic,
    relatedTopics: a.relatedTopics,
    indexable: true,
    priority: 0.7,
  }),
);

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Every indexable route on the site, in one place. */
export const SEO_PAGES: SEOPageEntry[] = [
  ...STATIC_PAGES,
  ...STATE_PAGES,
  ...AMOUNT_PAGES,
  ...LEARN_PAGES,
];

const BY_SLUG = new Map<string, SEOPageEntry>(SEO_PAGES.map((p) => [p.slug, p]));

export function getPageEntry(slug: string): SEOPageEntry | undefined {
  return BY_SLUG.get(slug);
}

export function indexablePages(): SEOPageEntry[] {
  return SEO_PAGES.filter((p) => p.indexable);
}

export function pagesByIntent(intent: SEOPageIntent): SEOPageEntry[] {
  return SEO_PAGES.filter((p) => p.intent === intent);
}

export function pagesByLottery(lottery: "powerball" | "mega-millions"): SEOPageEntry[] {
  return SEO_PAGES.filter((p) => p.lottery === lottery);
}

/** Breadcrumb trail for a slug: ordered from Home to the page itself. */
export function pageTrail(slug: string): Array<{ name: string; href: string }> {
  const trail: Array<{ name: string; href: string }> = [];
  const visited = new Set<string>();
  let current: SEOPageEntry | undefined = getPageEntry(slug);
  while (current && !visited.has(current.slug)) {
    visited.add(current.slug);
    trail.unshift({ name: current.crumbName, href: current.slug });
    current = current.parent ? getPageEntry(current.parent) : undefined;
  }
  return trail;
}
