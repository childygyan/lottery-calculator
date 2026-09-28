# Lottery Calculator

Estimate federal and state taxes on U.S. lottery winnings — and see the
estimated take-home amount for lump-sum (cash) or annuity payouts.

Built with [Astro](https://astro.build) 5, strict TypeScript, and Tailwind CSS.
No frameworks ship to the browser: one small vanilla-TS bundle (~13 kB raw)
powers the interactive calculator.

## Features

- **Lottery winnings calculator** — jackpot + cash option, all 50 states + DC
- **Tax-year architecture** — currently 2026; new years plug in as data files
- **Filing statuses** — single, married filing jointly/separately, head of household
- **Withholding vs. liability** — 24% federal withholding shown separately and
  credited against the estimated final tax, never added to it
- **Annuity mode** — 30-year equal-payment estimates
- **Verification-first data** — every tax rule carries a source, effective date,
  and `verified` / `needs_verification` status; unverified figures are never shown

## Development

```bash
npm install
npm run dev        # local dev server
npm run check      # strict TypeScript
npm test           # unit tests (67)
npm run build      # production build
npm run test:dom   # built-DOM smoke tests (needs build first)
npm run preview    # serve the production build
```

## Tax data

- `src/data/taxes/federal/<year>.ts` — IRS brackets, standard deductions, withholding
- `src/data/taxes/states/<year>.ts` — per-state planning rates with provenance
- `src/data/sources.ts` — central source registry

All figures are **planning estimates**, not tax advice. See `/disclaimer/`.

## License

Private project — all rights reserved.
