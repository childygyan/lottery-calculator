/**
 * queue.ts — the article program for lotterycalculator.site.
 * Daily 2026-10-13 → 2026-10-18; every 2 days from 2026-10-19
 * (Firoz, 2026-10-19) → last article 2026-11-04. 15 articles total.
 * The publisher cron still fires daily; the date check below skips
 * non-publish days, so the effective cadence is 1 article / 2 days.
 *
 * Each entry is a COMPLETE draft living in `src/pages/learn/_drafts/<slug>/`
 * as a single self-contained `index.astro` built on the shared
 * `LearnArticle.astro` layout. Astro ignores `_`-prefixed directories for
 * routing, so drafts are invisible until published.
 *
 * IMPORTANT — import depth: drafts are written with the PUBLISHED depth
 * (`../../../components/...`), i.e. 3 directories under src/pages. They are
 * never compiled inside `_drafts/`; after the move in step 4 the imports
 * resolve correctly. Do NOT change import depth when publishing.
 *
 * THE DAILY PUBLISHER (cron `daily-article-publish-lt`) takes QUEUE[0] and,
 * in order:
 *  1. Read this file. If QUEUE is empty: the program is complete — call
 *     cron.remove with id `daily-article-publish-lt`, then report
 *     "15-day lottery article program complete — all articles published."
 *     and stop.
 *  2. Date check FIRST: let today = current date (Asia/Kolkata, YYYY-MM-DD).
 *     - If QUEUE[0].datePublished is AFTER today: do NOT publish. Report
 *       "Next article '<title>' is scheduled for <datePublished> — nothing
 *       to publish today." and stop. (The cron may fire before a date arrives.)
 *     - If QUEUE[0].datePublished is more than 1 day BEFORE today (a previous
 *       run failed): update this queue entry's datePublished to today, so the
 *       schedule stays truthful.
 *  3. Verify the draft exists: src/pages/learn/_drafts/<slug>/index.astro.
 *     Take the whole QUEUE[0] entry (slug, title, description, crumbName,
 *     primaryTopic, relatedTopics, datePublished).
 *  4. Move the draft into place (run from the repo root):
 *       mv src/pages/learn/_drafts/<slug> src/pages/learn/<slug>/
 *     Do NOT touch the imports (see note above).
 *  5. Register it in src/data/seo-pages.ts — append to LEARN_ARTICLES
 *     (after the last existing entry, before the closing `];`):
 *       {
 *         slug: "/learn/<slug>/",
 *         title: "<title>",
 *         description: "<description>",
 *         crumbName: "<crumbName>",
 *         primaryTopic: "<primaryTopic>",
 *         relatedTopics: [<relatedTopics>],
 *       },
 *     (Copy the values verbatim from the QUEUE[0] entry.)
 *  6. Delete the QUEUE[0] entry you just published from this file.
 *  7. Append to public/llms.txt under the "## Learn" section (after the
 *     "Guides hub" line):
 *       - <title>: https://lotterycalculator.site/learn/<slug>/
 *     (Use the real title from the queue entry.)
 *  8. From the repo root run: `npm run check`, then `npm run build`.
 *     BOTH must pass with zero errors. If anything fails: STOP here, do NOT
 *     push, and report the failure plainly.
 *  9. NO deploy step — Firoz deploys this site's Worker manually. Do NOT
 *     attempt any deployment.
 * 10. Verify: dist/learn/<slug>/index.html exists; the SEO metadata gate in
 *     the build output passed; `npm test` shows 0 failures.
 * 11. Stage and push (cwd = repo root): `git add -A` first (the push script
 *     reads tracked files from disk, so new/moved files must be staged),
 *     then
 *       python3 ~/workspace/skills/github/bin/gh_datapush.py childygyan/lottery-calculator main "Publish <slug> (<datePublished>)"
 *     — expect "PUSH OK". If it fails with a transient error, retry once.
 * 12. Optionally run `npm run indexnow` to submit the new URL (the key file
 *     validates once Firoz deploys; a 403 here is expected pre-deploy and is
 *     not a failure — just note it).
 * 13. Report in Hinglish, short (2-4 lines): which article was published
 *     (title + live path), verification counts (tests, pages, broken links),
 *     and that it goes live on Firoz's next manual deploy.
 *
 * Standing honesty rules for every draft (already enforced while writing):
 * no invented jackpot/cash values, no "cash is better"/"annuity is better",
 * no winning-number predictions or "how to win" claims, every figure labeled
 * an estimate, only real routes linked, only real registry sourceIds used.
 */

export interface LotteryArticleQueueEntry {
  slug: string;
  title: string;
  description: string;
  crumbName: string;
  primaryTopic: string;
  relatedTopics: string[];
  datePublished: string; // YYYY-MM-DD, Asia/Kolkata
}

export const QUEUE: LotteryArticleQueueEntry[] = [
  {
    slug: "lottery-pool-taxes",
    title: "Lottery Pools: Splitting Winnings and Taxes Without a Fight",
    description:
      "Office pools win together — then the tax bill arrives. How splits work, why each member is taxed on their share, and the paperwork that prevents disputes.",
    crumbName: "Lottery Pool Taxes",
    primaryTopic: "lottery-tax",
    relatedTopics: ["payout", "withholding"],
    datePublished: "2026-10-31",
  },
  {
    slug: "annuity-vs-lump-sum-tax-example",
    title: "Annuity vs Lump Sum Taxes: A Worked Example",
    description:
      "A $100 million win, worked through both payout choices with real 2026 federal brackets — so you can see exactly where the tax difference comes from.",
    crumbName: "Annuity vs Lump Sum: Worked Example",
    primaryTopic: "lottery-tax",
    relatedTopics: ["annuity", "cash-option"],
    datePublished: "2026-11-02",
  },
  {
    slug: "taxes-on-small-lottery-winnings",
    title: "Taxes on Small Lottery Winnings: The $5,000 Rule",
    description:
      "Win $600 or $4,999 or $10,000 — what changes at each line. The withholding threshold, reporting rules, and why small wins still count as income.",
    crumbName: "Taxes on Small Winnings",
    primaryTopic: "withholding",
    relatedTopics: ["lottery-tax"],
    datePublished: "2026-11-04",
  },
];
