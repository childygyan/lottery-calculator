/**
 * State page content model for /lottery-tax-calculator/[state]/.
 *
 * Content is generated from each state's verified tax rule — never
 * hand-duplicated per state, never invented. Templates vary by tax
 * treatment so pages are genuinely different where the underlying
 * tax facts differ. Large repeated blocks live here, not in the route.
 */
import type { StateTaxRule } from "../../lib/calculator/types.ts";
import { formatPercent } from "../../lib/calculator/formatting.ts";
import { getRelatedSlugs } from "./related.ts";

export interface StateFaq {
  question: string;
  answer: string;
}

export interface StatePageContent {
  slug: string;
  /** 2–3 sentence state-specific introduction. */
  intro: string;
  /** How the state's lottery tax works (paragraphs). */
  taxExplanation: string[];
  /** Withholding explanation (paragraphs). */
  withholdingExplanation: string[];
  /** Cash option vs annuity notes (paragraphs). */
  annuityNotes: string[];
  /** State-specific FAQs, visibly rendered and mirrored in FAQ schema. */
  faqs: StateFaq[];
  /** Concise, natural meta description. */
  metaDescription: string;
}

/** Per-state extra sentences for cases a template can't cover. */
const STATE_NOTES: Record<string, string> = {
  NH: "New Hampshire's former tax on interest and dividends was repealed effective 2025.",
  MD: "Maryland counties levy their own local income taxes on top of the state rate — those are not included in the estimate.",
  MA: "Massachusetts' top rate includes a 4% surtax on income over $1,083,150.",
};

function rateLabel(rule: StateTaxRule): string {
  return rule.taxRate === null ? "" : formatPercent(rule.taxRate);
}

/**
 * One honest, data-grounded sentence contrasting the state with its
 * neighbors' verified treatments. Derived from the same dataset as the
 * estimates — never researched per page, never invented.
 */
function neighborContrast(rule: StateTaxRule, allRules: StateTaxRule[]): string | null {
  const neighbors = getRelatedSlugs(rule.slug)
    .map((slug) => allRules.find((r) => r.slug === slug))
    .filter(
      (r): r is StateTaxRule => !!r && r.status !== "needs_verification",
    );
  if (neighbors.length === 0) return null;

  const joinNames = (names: string[]): string =>
    names.length > 2
      ? `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`
      : names.join(" and ");

  if (!rule.lotteryTaxApplicable) {
    const taxed = neighbors.filter(
      (r) => r.lotteryTaxApplicable && r.taxRate !== null,
    );
    if (taxed.length === 0) return null;
    const names = joinNames(
      taxed.map((r) => `${r.name} (${formatPercent(r.taxRate as number)})`),
    );
    return `Cross the border and the deal changes: ${names} ${taxed.length === 1 ? "taxes" : "tax"} lottery winnings as ordinary income.`;
  }

  const untaxed = neighbors.filter((r) => !r.lotteryTaxApplicable);
  if (untaxed.length > 0) {
    const names = joinNames(untaxed.map((r) => r.name));
    return `Nearby ${names} ${untaxed.length === 1 ? "doesn't" : "don't"} tax lottery winnings at the state level — a reminder that where you live can matter as much as where you bought the ticket.`;
  }
  const taxed = neighbors.filter(
    (r) => r.lotteryTaxApplicable && r.taxRate !== null,
  );
  if (taxed.length === 0) return null;
  const names = joinNames(
    taxed.map((r) => `${r.name} (${formatPercent(r.taxRate as number)})`),
  );
  return `For comparison, nearby ${names} ${taxed.length === 1 ? "taxes" : "tax"} lottery winnings as ordinary income.`;
}

function withContrast(
  paragraphs: string[],
  rule: StateTaxRule,
  allRules: StateTaxRule[],
): string[] {
  const contrast = neighborContrast(rule, allRules);
  return contrast ? [...paragraphs, contrast] : paragraphs;
}

function calcTypeLabel(rule: StateTaxRule): string {
  return rule.taxCalculationType === "flat_rate_estimate"
    ? "flat"
    : "top marginal";
}

function noTaxContent(rule: StateTaxRule, allRules: StateTaxRule[]): StatePageContent {
  const { name } = rule;
  const extra = STATE_NOTES[rule.code] ? ` ${STATE_NOTES[rule.code]}` : "";
  return {
    slug: rule.slug,
    intro:
      `${name} does not levy a broad individual income tax, so the state won't take a share of your lottery winnings.${extra} ` +
      `You still owe federal income tax on the full amount — on a large jackpot, that's the biggest slice by far. ` +
      `Use the calculator below to estimate your 2026 federal tax and take-home for a lump sum or annuity.`,
    taxExplanation: withContrast(
      [
        `Lottery and gambling winnings are ordinary income under federal law, so the IRS taxes them at your regular income-tax rates. What ${name} doesn't do is add a second layer: with no broad individual income tax, there is no ${name} tax return line for your winnings.`,
        `That doesn't mean tax-free. A large jackpot can push you into the top 37% federal bracket, and the standard deduction ($16,100 for single filers in 2026) barely dents a multi-million-dollar prize. The estimate below shows the federal bite and your take-home.`,
      ],
      rule,
      allRules,
    ),
    withholdingExplanation: [
      `Federal law requires the lottery to withhold 24% of winnings over $5,000 before you ever see the money. That withholding is a prepayment credited against your final federal tax bill — not the final tax itself.`,
      `${name} has no individual income tax to withhold, so there's no separate state withholding on your prize.`,
    ],
    annuityNotes: [
      `The advertised jackpot is the annuity value: 30 equal annual payments. Each payment is taxed in the year you receive it, which can keep more of the prize in lower federal brackets than taking everything at once.`,
      `In ${name}, the annuity advantage is purely federal — there's no state tax to spread out. Compare both options in the calculator above.`,
    ],
    faqs: [
      {
        question: `Does ${name} tax lottery winnings?`,
        answer: `No. ${name} does not have a broad individual income tax, so the state doesn't tax your lottery winnings. Federal income tax still applies to the full amount.`,
      },
      {
        question: `How much federal tax will I owe on lottery winnings in ${name}?`,
        answer: `It depends on the prize size, your filing status, and the tax year. For 2026, federal rates run from 10% to 37% after the standard deduction. Enter your jackpot in the calculator above for an estimate.`,
      },
      {
        question: `Will ${name} withhold taxes from my lottery prize?`,
        answer: `Only the federal 24% withholding on winnings over $5,000 applies. ${name} has no income tax to withhold.`,
      },
      {
        question: `What if I live in a different state than where I bought the ticket?`,
        answer: `Most states tax their residents' worldwide income, including lottery winnings from another state. Your home state's rules decide whether you owe tax there even when the ticket state doesn't tax the prize.`,
      },
    ],
    metaDescription: `${name} has no income tax on lottery winnings — estimate your 2026 federal tax and take-home for lump sum or annuity prizes with our free calculator.`,
  };
}

function californiaContent(rule: StateTaxRule, allRules: StateTaxRule[]): StatePageContent {
  return {
    slug: rule.slug,
    intro:
      `California is the rare exception: California Lottery winnings are exempt from California individual income tax. ` +
      `You still owe federal income tax on every dollar — the exemption only removes the state layer. ` +
      `Use the calculator below to estimate your 2026 federal tax and take-home.`,
    taxExplanation: withContrast(
      [
        `Under California law, prizes from the California Lottery are excluded from gross income for state tax purposes. That makes California functionally like a no-income-tax state for lottery winners — but only for California Lottery winnings.`,
        `The federal picture is unchanged: winnings are ordinary income, taxed at rates up to 37% in 2026. On a big jackpot the federal tax dwarfs everything else, exemption or not.`,
      ],
      rule,
      allRules,
    ),
    withholdingExplanation: [
      `Federal law requires 24% withholding on lottery winnings over $5,000 — a prepayment against your final federal bill, not the final tax.`,
      `Because California Lottery winnings are exempt from state tax, there is no California withholding on them.`,
    ],
    annuityNotes: [
      `The annuity pays the advertised jackpot as 30 equal annual payments, each taxed federally in the year received. Spreading payments can keep more of the prize in lower federal brackets.`,
      `The California exemption applies to the winnings however you take them — the choice between cash and annuity is a federal-tax and time-value question.`,
    ],
    faqs: [
      {
        question: `Are lottery winnings taxable in California?`,
        answer: `California Lottery winnings are exempt from California individual income tax. Federal income tax still applies to the full amount.`,
      },
      {
        question: `Does the exemption cover out-of-state lottery winnings?`,
        answer: `The exemption applies to California Lottery winnings. If you're a California resident with winnings from another state's lottery, consult the Franchise Tax Board's guidance — the calculator above estimates the federal tax either way.`,
      },
      {
        question: `How much federal tax will I owe on California Lottery winnings?`,
        answer: `Winnings are federal ordinary income, taxed at 10%–37% for 2026 depending on the amount and your filing status. Use the calculator above for an estimate.`,
      },
      {
        question: `Is 24% withholding the final tax?`,
        answer: `No. The 24% federal withholding on winnings over $5,000 is credited against your final tax bill. On a large jackpot your actual federal rate is usually higher, and you'll owe the difference at filing time.`,
      },
    ],
    metaDescription: `California Lottery winnings are exempt from state income tax. Estimate your 2026 federal tax and take-home for lump sum or annuity prizes.`,
  };
}

function ordinaryIncomeContent(rule: StateTaxRule, allRules: StateTaxRule[]): StatePageContent {
  const { name } = rule;
  const rate = rateLabel(rule);
  const calcType = calcTypeLabel(rule);
  const extra = STATE_NOTES[rule.code] ? ` ${STATE_NOTES[rule.code]}` : "";
  return {
    slug: rule.slug,
    intro:
      `Won the lottery in ${name}? The state taxes lottery winnings as ordinary income. ` +
      `For planning purposes, the calculator below estimates ${name} tax using the ${calcType} rate of ${rate} for 2026.${extra} ` +
      `Enter your jackpot to see estimated federal tax, state tax, and take-home for a lump sum or annuity.`,
    taxExplanation: withContrast(
      [
        `${name} treats lottery winnings like any other ordinary income — wages, in effect. For 2026 we estimate the state tax by applying the ${calcType} rate of ${rate} flat to the winnings.`,
        `That's a planning estimate, not a precise return calculation. Your actual ${name} tax depends on the state's brackets, deductions, exemptions, credits, and any local taxes, which aren't included.`,
      ],
      rule,
      allRules,
    ),
    withholdingExplanation: [
      `Federal law requires 24% withholding on lottery winnings over $5,000. It's a prepayment credited against your final federal tax, not the final tax itself — on a large prize you'll typically owe more at filing time.`,
      `States and lotteries also withhold for state tax, but the rates and rules vary enough that we don't show a single state withholding figure. Check the official ${name} lottery's prize-claim information for what will actually be withheld from your check.`,
    ],
    annuityNotes: [
      `The advertised jackpot is the annuity value: 30 equal annual payments. Each payment is taxed in the year you receive it — federally and by ${name} under that year's rules — which can keep more of the prize in lower brackets than a single lump sum.`,
      `The lump sum (cash option) is smaller than the advertised jackpot but taxed once, now. Toggle between the two in the calculator to compare.`,
    ],
    faqs: [
      {
        question: `Does ${name} tax lottery winnings?`,
        answer: `Yes. ${name} taxes lottery winnings as ordinary income. For 2026 we use a ${calcType} planning rate of ${rate} to estimate the state tax.`,
      },
      {
        question: `How is the ${name} lottery tax estimated?`,
        answer: `We apply the ${rate} ${calcType} rate flat to the winnings as a planning estimate. Your actual tax depends on ${name}'s brackets, deductions, exemptions, credits, and any local taxes.`,
      },
      {
        question: `How much will be withheld from my ${name} lottery winnings?`,
        answer: `Federal withholding is 24% on winnings over $5,000. State withholding varies by lottery and prize, so we don't present a single verified figure — check the official ${name} lottery's claim information.`,
      },
      {
        question: `Should I take the lump sum or the annuity in ${name}?`,
        answer: `Tax-wise, the annuity spreads income across 30 tax years, which can mean lower brackets each year. The lump sum is taxed all at once but gives you the money now. The calculator above estimates both; the right choice also depends on investing, spending, and personal factors — not just tax.`,
      },
    ],
    metaDescription: `Estimate ${name} lottery taxes for 2026: federal + state tax and take-home on lump sum or annuity winnings. Free calculator with a ${rate} planning rate.`,
  };
}

function needsVerificationContent(rule: StateTaxRule): StatePageContent {
  const { name } = rule;
  return {
    slug: rule.slug,
    intro:
      `${name}'s 2026 lottery tax treatment is currently marked for verification — published rates may have changed under recent legislation. ` +
      `The calculator below still estimates your federal tax, which is fully verified. ` +
      `State-specific figures are withheld until the ${name} rules are confirmed against an authoritative source.`,
    taxExplanation: [
      `A top rate has been published for ${name}, but reports of 2026 legislation affecting it are not yet confirmed against an authoritative source. Rather than show a figure we can't stand behind, we show the federal estimate and mark the state portion as pending.`,
      `Before relying on any ${name} figure, verify current law with the ${name} State Tax Department or a tax professional.`,
    ],
    withholdingExplanation: [
      `Federal law requires 24% withholding on lottery winnings over $5,000 — a prepayment credited against your final federal tax, not the final tax.`,
      `State withholding for ${name} isn't shown while the underlying rate is under verification.`,
    ],
    annuityNotes: [
      `The advertised jackpot is the annuity value: 30 equal annual payments, each taxed in the year received. That spreading can lower the federal bracket bite versus a lump sum.`,
      `How ${name} would tax each annual payment depends on the verified 2026 rules — currently pending.`,
    ],
    faqs: [
      {
        question: `Why isn't a ${name} state tax shown?`,
        answer: `The published 2026 rate for ${name} may have changed under recent legislation that we haven't confirmed against an authoritative source. We show the verified federal estimate and withhold the state figure rather than risk showing a wrong number.`,
      },
      {
        question: `Is the federal estimate still reliable?`,
        answer: `Yes. Federal brackets, standard deductions, and the 24% withholding rule for 2026 are verified against IRS publications. Only the ${name}-specific portion is pending.`,
      },
      {
        question: `Where can I verify ${name}'s current lottery tax rules?`,
        answer: `Check the ${name} State Tax Department's official guidance or consult a tax professional before making decisions based on state tax figures.`,
      },
    ],
    metaDescription: `${name} lottery tax calculator: estimate 2026 federal tax and take-home on winnings. State figures pending verification — federal estimate verified.`,
  };
}

/**
 * Shared federal-tax explainer rendered on every state page.
 * Federal treatment doesn't vary by state, so one honest block lives here
 * instead of being duplicated in the route.
 */
export const FEDERAL_TAX_SECTION: string[] = [
  "The federal government taxes lottery winnings as ordinary income — the same category as your salary. For 2026, that means marginal rates from 10% up to 37%, applied after the standard deduction ($16,100 for single filers, $32,200 for married couples filing jointly).",
  "A jackpot-sized win lands almost entirely in the top brackets, which is why the federal tax is usually the largest slice of any prize. Your filing status matters: the same winnings can produce a meaningfully different federal bill for a single filer versus a married couple filing jointly — try both in the calculator above.",
];

/**
 * Build the full page content for a state's rule.
 * Returns null for treatments with no defined template (never happens
 * with current data, but keeps the route honest if data ever changes).
 */
export function getStatePageContent(
  rule: StateTaxRule,
  allRules: StateTaxRule[],
): StatePageContent | null {
  if (rule.status === "needs_verification") return needsVerificationContent(rule);
  switch (rule.taxTreatment) {
    case "no_state_individual_income_tax":
      return noTaxContent(rule, allRules);
    case "special_exemption":
      return californiaContent(rule, allRules);
    case "ordinary_income":
      return ordinaryIncomeContent(rule, allRules);
    default:
      return null;
  }
}
