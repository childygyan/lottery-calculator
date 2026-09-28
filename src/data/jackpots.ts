/**
 * Jackpot amount pages data model.
 *
 * Each amount page (/lottery-payout-calculator/<slug>/) is generated from
 * one of these configs. Content is written per-amount — never produced by
 * swapping the dollar figure inside identical text. Numerical examples on
 * the pages are computed at build time with the real calculation engine,
 * so every figure shown is supported by the implemented model.
 */

export interface JackpotFaq {
  question: string;
  answer: string;
}

export interface JackpotContextBullet {
  heading: string;
  body: string;
}

export interface JackpotAmount {
  slug: string;
  /** Jackpot in USD, e.g. 100_000_000. */
  amount: number;
  /** "$100 Million" */
  label: string;
  /** "$100M" */
  shortLabel: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  afterTaxHeading: string;
  afterTaxBody: string[];
  cashAnnuityHeading: string;
  cashAnnuityBody: string[];
  contextBullets: JackpotContextBullet[];
  faqs: JackpotFaq[];
}

const SHARED_WITHHOLDING_NOTE =
  "Federal law requires 24% withholding on lottery winnings over $5,000, but withholding is a prepayment credited against your final tax bill — not the final tax itself.";

export const JACKPOT_AMOUNTS: JackpotAmount[] = [
  {
    slug: "1-million",
    amount: 1_000_000,
    label: "$1 Million",
    shortLabel: "$1M",
    title: "$1 Million Lottery Payout Calculator — Taxes & Take-Home",
    description:
      "How much is $1 million after taxes? Estimate the cash option, annuity payments, federal and state taxes, and take-home for a $1 million lottery jackpot.",
    h1: "$1 Million Lottery Payout Calculator",
    lede:
      "A $1 million jackpot is the most relatable lottery win: big enough to change a life, small enough to picture. But the advertised $1 million is the annuity total — the cash option is smaller, and taxes take a real share of either. Enter your numbers below for an estimate.",
    afterTaxHeading: "How much is $1 million after taxes?",
    afterTaxBody: [
      "On a $1 million lump sum, federal tax treats the winnings as ordinary income stacked on top of everything else you earn that year. The top 37% federal bracket applies to income above roughly $600,000 for a single filer, so a large part of a $1 million win is taxed at the highest federal rates — but the first few hundred thousand is taxed at lower brackets, which pulls the effective rate below 37%.",
      "State tax is where $1 million winners see the widest range of outcomes. Nine states have no broad individual income tax, and California exempts lottery winnings from state tax, so a winner there owes $0 to the state. In a high-tax state, the state's planning rate can take another double-digit percentage. Select your state in the calculator to see both extremes.",
      "The annuity version of a $1 million jackpot pays about $33,333 per year for 30 years before tax. Each payment is taxed as that year's income, so the effective rate on each payment is lower than on a lump sum — but you receive the money over three decades, not today.",
    ],
    cashAnnuityHeading: "Cash vs annuity on a $1 million jackpot",
    cashAnnuityBody: [
      "The cash option on a $1 million advertised jackpot is the lump sum actually in the prize pool — always less than $1 million. Because the gap between the advertised jackpot and the cash value is smaller in absolute dollars at this level, the cash-vs-annuity decision is less about the discount and more about timing: money now versus a steady $33,333-a-year stream.",
      "Tax-wise, the annuity spreads income across 30 tax years, so each year's payment lands in lower brackets than a single $1 million lump sum would. The trade-off is time: 30 years of payments versus one payment you can invest, spend, or give away today. The comparison table below shows both side by side with estimated taxes — it does not recommend one over the other.",
    ],
    contextBullets: [
      {
        heading: "What $1 million means in practice",
        body: "After federal and state taxes, a $1 million lump sum typically leaves roughly half to two-thirds of the advertised amount, depending on the state — use the calculator with your state selected for the actual estimate.",
      },
      {
        heading: "Why the cash option matters even at $1 million",
        body: "Lotteries advertise the annuity total. The cash option — the amount you'd actually receive as a lump sum — is set by the prize pool and is always lower. Never plan around the $1 million figure until you've entered the real cash value from the official prize announcement.",
      },
      {
        heading: "Annuity payments are ordinary income each year",
        body: "Each ~$33,333 annuity payment is taxed in the year you receive it. That keeps every payment in lower brackets than a lump sum, but the payments arrive over 30 years.",
      },
    ],
    faqs: [
      {
        question: "How much is $1 million after taxes?",
        answer:
          "It depends on whether you take cash or annuity, your state, and your filing status. A $1 million lump sum is taxed as ordinary income in one year, so much of it falls in the top federal brackets; state tax ranges from $0 (no-income-tax states, and California which exempts lottery winnings) to double-digit rates elsewhere. Enter the cash value and your state in the calculator above for an estimate.",
      },
      {
        question: "What is the cash option on a $1 million jackpot?",
        answer:
          "The cash option is the lump sum actually available in the prize pool — always less than the advertised $1 million annuity total. The exact figure comes from the official prize announcement for your drawing; enter it in the calculator rather than guessing.",
      },
      {
        question: "How does the annuity work on a $1 million jackpot?",
        answer:
          "The $1 million is paid as 30 annual payments of about $33,333 before tax. Each payment is taxed as income in the year you receive it, which usually means a lower effective rate per payment than a lump sum — spread over 30 years.",
      },
      {
        question: "Is lottery withholding the same as final tax on $1 million?",
        answer:
          "No. " +
          SHARED_WITHHOLDING_NOTE +
          " On a $1 million win, the final combined rate is usually well above 24%.",
      },
      {
        question: "Can I calculate $1 million in winnings for my state?",
        answer:
          "Yes — select your state in the calculator above. It estimates state tax with your state's configured planning rate (or $0 where lottery winnings aren't taxed) and shows federal and state estimates side by side.",
      },
    ],
  },
  {
    slug: "10-million",
    amount: 10_000_000,
    label: "$10 Million",
    shortLabel: "$10M",
    title: "$10 Million Lottery Payout Calculator — Taxes & Take-Home",
    description:
      "Estimate taxes and take-home on a $10 million lottery jackpot. Compare the cash option vs annuity payments with federal and state tax estimates for your state.",
    h1: "$10 Million Lottery Payout Calculator",
    lede:
      "A $10 million jackpot sits in the sweet spot of lottery dreams: enough to retire on, not enough to make national news. The advertised $10 million is the 30-year annuity total — the lump sum is smaller, and on this size of win the top federal tax bracket applies to nearly all of it. See what each option really leaves behind below.",
    afterTaxHeading: "How much is $10 million after taxes?",
    afterTaxBody: [
      "At $10 million, the federal picture is simple and steep: the 37% top bracket covers income above roughly $600,000 for a single filer, so the overwhelming majority of a $10 million lump sum is taxed at 37% federally, plus the lower brackets on the first slice. The federal effective rate lands in the mid-30s — noticeably higher than on a $1 million win, where more of the prize falls in lower brackets.",
      "State tax is the swing factor. In Texas, Florida, or the other no-income-tax states — or in California, which exempts lottery winnings — the state takes $0. In a high-rate state, another ~10% or more of the prize can go to the state. On $10 million, that difference is worth more than a million dollars, which is why the state selector matters.",
      "Taken as an annuity, $10 million pays about $333,333 per year for 30 years before tax. Each payment is taxed in its year, so the effective rate per payment is lower than the lump-sum rate — the same federal brackets apply, but the income is spread across three decades.",
    ],
    cashAnnuityHeading: "Cash vs annuity on a $10 million jackpot",
    cashAnnuityBody: [
      "The cash option on a $10 million jackpot is the lump sum in the prize pool — typically a little under half the advertised amount, though the exact figure varies by drawing and must come from the official announcement. On $10 million, that discount is worth several million dollars in absolute terms, which is why winners weigh it carefully.",
      "The annuity pays the full $10 million nominal total over 30 years. Because each ~$333,333 payment is taxed separately, the lifetime tax bill can be lower than the lump-sum bill — but the payments arrive over 30 years, and future tax law can change. The comparison below lays out gross, estimated taxes, and estimated net for both, with no recommendation.",
    ],
    contextBullets: [
      {
        heading: "The top bracket dominates at $10 million",
        body: "Unlike smaller wins, nearly all of a $10 million lump sum falls in the 37% federal bracket. The federal effective rate is therefore close to 37% minus the small benefit of the lower brackets on the first ~$600,000.",
      },
      {
        heading: "State choice is worth seven figures here",
        body: "The gap between a $0-state-tax outcome and a high-tax-state outcome on $10 million can exceed $1 million. This is the single biggest variable a winner controls (by residence, not by choice of prize).",
      },
      {
        heading: "Annuity: ~$333,333 a year before tax",
        body: "Thirty annual payments of about $333,333. Each is taxed as that year's income — lower effective rates per payment, but three decades of waiting for the full amount.",
      },
    ],
    faqs: [
      {
        question: "How much is $10 million after taxes?",
        answer:
          "On a $10 million lump sum, expect a federal effective rate in the mid-30s (the 37% top bracket covers nearly all of it), plus state tax from $0 to double digits depending on where you live. The calculator above estimates both with your state, tax year, and filing status.",
      },
      {
        question: "What is the cash option for a $10 million jackpot?",
        answer:
          "The cash option is the lump sum actually in the prize pool — always less than the advertised $10 million. It varies by drawing; the official prize announcement lists the exact figure. Enter it in the calculator instead of assuming a fixed percentage.",
      },
      {
        question: "How does a lottery annuity work on $10 million?",
        answer:
          "The $10 million is paid as 30 annual payments of about $333,333 before tax (more if the game's annuity grows each year, as Mega Millions' does at 5%). Each payment is taxed as income in the year received.",
      },
      {
        question: "Why is the cash option smaller than the advertised jackpot?",
        answer:
          "The advertised jackpot is the nominal total of 30 annuity payments over decades. The cash option is the present value sitting in the prize pool today — the amount the lottery actually has on hand to pay you now.",
      },
      {
        question: "Are lottery annuity payments taxable?",
        answer:
          "Yes. Every annuity payment is taxed as ordinary income in the year you receive it — federally always, and by most states. California exempts lottery winnings from state tax; nine other states have no broad income tax to apply.",
      },
      {
        question: "Is lottery withholding the same as final tax?",
        answer:
          "No. " +
          SHARED_WITHHOLDING_NOTE +
          " On a $10 million win, your final combined rate will be well above 24%.",
      },
    ],
  },
  {
    slug: "100-million",
    amount: 100_000_000,
    label: "$100 Million",
    shortLabel: "$100M",
    title: "$100 Million Lottery Payout Calculator — Taxes & Take-Home",
    description:
      "What is $100 million really worth? Estimate the cash option, 30-year annuity payments, federal and state taxes, and take-home on a $100 million lottery jackpot.",
    h1: "$100 Million Lottery Payout Calculator",
    lede:
      "A $100 million jackpot is the classic nine-figure dream — and a case study in why the advertised number misleads. The cash option is typically around half the headline figure, and combined taxes can take more than a third of either option. This page walks through the real math: gross, taxes, timing, and net.",
    afterTaxHeading: "How much is $100 million after taxes?",
    afterTaxBody: [
      "On a $100 million lump sum, the federal math is almost entirely the top bracket: 37% applies to everything above roughly $600,000 for a single filer, so the federal effective rate settles just under 37%. There is no higher federal bracket waiting — $100 million is taxed at the same top rate as $10 million, just on a bigger base.",
      "That makes state tax the decisive variable. A winner in Florida or Texas (no income tax) or California (lottery winnings exempt) owes $0 to the state; a winner in a high-tax state can owe an additional ~10% of the prize. On $100 million, the state line alone is worth roughly $10 million.",
      "As an annuity, $100 million pays about $3.33 million per year for 30 years before tax — or growing payments if the game's annuity escalates (Mega Millions grows 5% annually). Each payment is taxed in its year at the same top-heavy federal rates, since even one payment dwarfs the bracket thresholds.",
    ],
    cashAnnuityHeading: "Cash vs annuity on a $100 million jackpot",
    cashAnnuityBody: [
      "The cash option on a $100 million jackpot — the lump sum actually available — is often roughly half the advertised figure (the exact amount comes from the official announcement and varies by drawing). That means the annuity's headline advantage is largely the time value of three decades of payments, not free money.",
      "After tax, the comparison narrows further: both options face the same 37% top federal rate, so the annuity's tax edge is modest at this size — the real differences are timing and control. One payment now that you manage yourself, versus 30 payments the lottery manages for you. The table below shows gross, estimated taxes, and estimated net for each, with the schedule expandable year by year. No option is ranked above the other.",
    ],
    contextBullets: [
      {
        heading: "The 37% ceiling is already in play",
        body: "Federal tax does not get steeper above $100 million — the top bracket already covers nearly the whole prize. Bigger jackpots scale the dollars, not the federal rate.",
      },
      {
        heading: "Cash is roughly half — but verify",
        body: "On nine-figure jackpots the cash option is often around half the advertised annuity total, but the ratio moves with interest rates and the prize pool. Always use the official cash value, never a rule of thumb.",
      },
      {
        heading: "Annuity: ~$3.33 million a year before tax",
        body: "Thirty annual payments averaging about $3.33 million. With a growing annuity (like Mega Millions' 5%), early payments are smaller and later payments larger — the nominal total is still $100 million.",
      },
    ],
    faqs: [
      {
        question: "How much is $100 million after taxes?",
        answer:
          "Roughly 37% goes to federal tax on most of it (the top bracket covers nearly the entire prize), plus $0 to ~10%+ for state tax depending on where you live. A $100 million lump sum therefore nets on the order of $55–65 million after combined taxes — enter the actual cash value and your state above for a precise estimate.",
      },
      {
        question: "What is the cash option for a $100 million jackpot?",
        answer:
          "The cash option is the lump sum in the prize pool, often roughly half the $100 million advertised annuity total — but the exact figure varies by drawing and is published in the official prize announcement. Enter that figure in the calculator; never assume a fixed percentage.",
      },
      {
        question: "How does a $100 million jackpot compare between cash and annuity?",
        answer:
          "The annuity pays the full $100 million nominal total over 30 years (~$3.33M/year before tax); the cash option pays a smaller lump sum now. Both face the same top federal rate, so the annuity's tax advantage is modest — the meaningful differences are timing, control, and the decades-long wait. The comparison table above shows both with estimated taxes.",
      },
      {
        question: "Why is the cash option smaller than the advertised jackpot?",
        answer:
          "The $100 million headline is the sum of 30 payments spread over decades. The cash option is what the prize pool holds today — the present value of that stream. Lotteries advertise the bigger annuity number; the cash value is the smaller, real lump sum.",
      },
      {
        question: "Are lottery annuity payments taxable?",
        answer:
          "Yes — each of the 30 payments is taxed as ordinary income in the year received. At ~$3.33 million per payment, nearly every payment is taxed at the top federal rate, plus applicable state tax.",
      },
      {
        question: "Is lottery withholding the same as final tax?",
        answer:
          "No. " +
          SHARED_WITHHOLDING_NOTE +
          " On a nine-figure win, the final combined rate is far above 24% — withholding covers only part of the bill.",
      },
    ],
  },
  {
    slug: "500-million",
    amount: 500_000_000,
    label: "$500 Million",
    shortLabel: "$500M",
    title: "$500 Million Lottery Payout Calculator — Taxes & Take-Home",
    description:
      "Estimate the real value of a $500 million lottery jackpot: cash option vs 30-year annuity, federal and state tax estimates, and take-home for your state.",
    h1: "$500 Million Lottery Payout Calculator",
    lede:
      "Half a billion dollars — the kind of jackpot that makes national news for weeks. At this scale, the honest math surprises people: the federal rate is no higher than on a $10 million win, the cash option is hundreds of millions below the headline, and state tax alone can exceed the entire prize of a smaller jackpot. Here's the full breakdown.",
    afterTaxHeading: "How much is $500 million after taxes?",
    afterTaxBody: [
      "The federal rate on $500 million is essentially the same as on $100 million or $10 million: the 37% top bracket already covers nearly everything above roughly $600,000, so scaling the jackpot up doesn't scale the rate. The federal effective rate converges just under 37% for any of these mega-jackpots.",
      "What does scale is everything else. State tax at ~10% on $500 million is ~$50 million — more than most entire lottery jackpots. The cash-option discount, often roughly half the advertised total, represents ~$250 million in absolute dollars. At this level, every percentage point in the calculation is worth millions, which is why estimates must use the real cash value and the real state rate.",
      "As an annuity, $500 million means about $16.67 million per year for 30 years before tax. Every single payment is taxed at the top federal rate, plus state tax — the per-payment effective rate barely differs from the lump-sum rate, because even one payment is forty times the top-bracket threshold.",
    ],
    cashAnnuityHeading: "Cash vs annuity on a $500 million jackpot",
    cashAnnuityBody: [
      "The cash option on a $500 million jackpot is the lump sum in the prize pool — typically hundreds of millions below the headline figure. The exact amount is published with the official prize announcement; on a jackpot this size, guessing wrong by even a few percentage points means an error of tens of millions of dollars.",
      "The annuity pays the full $500 million nominal total across 30 years. Its tax treatment per payment is nearly identical to the lump sum's (the top bracket swallows every payment), so the comparison comes down to timing and stewardship: ~$250 million now under your control, versus ~$16.67 million a year for three decades. The table below presents both with estimated taxes and the full payment schedule — and ranks neither.",
    ],
    contextBullets: [
      {
        heading: "Rate convergence: $500M is taxed like $100M",
        body: "Once the top federal bracket covers the whole prize, bigger jackpots don't face higher federal rates — only bigger dollar amounts. The federal effective rate on $500 million is within a point of the rate on $100 million.",
      },
      {
        heading: "State tax alone can exceed $50 million",
        body: "A ~10% state planning rate on $500 million is about $50 million — larger than many entire advertised jackpots. Winners in no-income-tax states (or California, where lottery winnings are exempt) keep all of it.",
      },
      {
        heading: "Annuity: ~$16.67 million a year before tax",
        body: "Thirty annual payments averaging about $16.67 million. Each payment is taxed at the top rates in its year — the per-payment effective rate is nearly the same as the lump-sum rate at this scale.",
      },
    ],
    faqs: [
      {
        question: "How much is $500 million after taxes?",
        answer:
          "Federal tax takes just under 37% of nearly the whole prize (the top bracket applies throughout), and state tax adds $0 to ~10%+ depending on residence. A $500 million lump sum therefore nets roughly in the high-$200 millions to low-$300 millions after combined taxes — use the calculator with the official cash value and your state for the estimate.",
      },
      {
        question: "What is the cash option on a $500 million jackpot?",
        answer:
          "The lump sum actually available in the prize pool — hundreds of millions below the $500 million headline. The official prize announcement publishes the exact cash value for each drawing; enter it above rather than estimating from a percentage.",
      },
      {
        question: "Is a $500 million jackpot taxed at a higher rate than $100 million?",
        answer:
          "No — not federally. The 37% top bracket already covers nearly all of a $100 million prize, so $500 million faces the same top rate on a larger base. State tax can differ by residence, but the federal effective rates are within about a point of each other.",
      },
      {
        question: "How does the annuity work on $500 million?",
        answer:
          "Thirty annual payments averaging about $16.67 million before tax (growing each year under escalating structures like Mega Millions'). Each payment is taxed as that year's income at the top rates.",
      },
      {
        question: "Why is the cash option smaller than the advertised jackpot?",
        answer:
          "The $500 million is the nominal sum of 30 payments over decades. The cash option is the present value in the prize pool today. The gap — often roughly half at this scale — reflects decades of time value, not a fee.",
      },
      {
        question: "Can I calculate $500 million in winnings for my state?",
        answer:
          "Yes. Select your state in the calculator — it applies your state's configured planning rate (or $0 where lottery winnings are exempt or there's no income tax) alongside the federal estimate.",
      },
    ],
  },
  {
    slug: "1-billion",
    amount: 1_000_000_000,
    label: "$1 Billion",
    shortLabel: "$1B",
    title: "$1 Billion Lottery Payout Calculator — Taxes & Take-Home",
    description:
      "What is a $1 billion lottery jackpot really worth? Compare the cash option vs annuity, estimate federal and state taxes, and see the take-home for your state.",
    h1: "$1 Billion Lottery Payout Calculator",
    lede:
      "A billion-dollar jackpot is the Everest of lottery prizes — and the most misunderstood number in gambling. Nobody receives $1 billion: the cash option is a fraction of the headline, taxes take more than a third, and the annuity is thirty payments, not a wire transfer. This page breaks down what $1 billion actually means.",
    afterTaxHeading: "What does a $1 billion advertised jackpot mean for cash value?",
    afterTaxBody: [
      "The $1 billion figure is the nominal total of 30 annuity payments — it is not an amount of money sitting anywhere. The cash option is the lump sum actually in the prize pool, and on billion-dollar jackpots it is typically well under half the advertised total. The exact figure is published in the official prize announcement for the drawing; everything else is speculation.",
      "This is where the 'never assume a fixed percentage' rule matters most. On a $1 billion jackpot, the difference between a 45% and a 55% cash value is $100 million — more than most entire jackpots. Any calculator that hard-codes a cash ratio is inventing the single most important number. Enter the official cash value above.",
      "After tax, the federal rate on $1 billion is the same story as $500 million or $100 million: the 37% top bracket covers essentially the entire prize, so the federal effective rate converges just under 37%. State tax adds $0 (no-income-tax states, or California's lottery exemption) to ~10%+ — a swing of roughly $100 million on this size of prize.",
    ],
    cashAnnuityHeading: "Cash vs annuity on a $1 billion jackpot",
    cashAnnuityBody: [
      "Cash means one payment of the official cash value — hundreds of millions of dollars — taxed entirely in a single year at the top rates. Annuity means 30 annual payments averaging about $33.33 million before tax, each taxed in its year, also at the top rates. The federal tax treatment is nearly identical either way; the nominal totals differ enormously because one is a present value and the other is a 30-year sum.",
      "Framed honestly: the annuity's extra hundreds of millions are not a bonus — they are the time value of waiting up to 30 years for the full amount. The comparison table below shows gross, estimated taxes, estimated net, and the year-by-year schedule for both options. It presents the numbers; it does not tell you which to choose.",
    ],
    contextBullets: [
      {
        heading: "Nobody receives $1 billion",
        body: "The headline is a 30-year nominal sum. The cash option — the only lump sum that exists — is a fraction of it, set by the prize pool and published per drawing. Start every estimate from the official cash value.",
      },
      {
        heading: "The federal rate stops rising",
        body: "There is no 40% or 50% federal bracket for billionaires' winnings. The top rate is 37%, and it already applied in full at $10 million. $1 billion scales the tax dollars, not the rate.",
      },
      {
        heading: "Annuity: ~$33.33 million a year before tax",
        body: "Thirty annual payments averaging about $33.33 million. Under a 5%-growing structure the first payment is far smaller and the last far larger — the schedule below can model either.",
      },
    ],
    faqs: [
      {
        question: "What does a $1 billion advertised jackpot mean for cash value?",
        answer:
          "It means the annuity totals $1 billion across 30 payments — not that $1 billion exists as a lump sum. The cash option is the smaller amount actually in the prize pool, published in the official prize announcement. On billion-dollar jackpots the cash value is typically well under half the headline; enter the official figure in the calculator above.",
      },
      {
        question: "How much is $1 billion after taxes?",
        answer:
          "Federal tax takes just under 37% of nearly the entire prize, and state tax adds $0 to ~10%+ by residence — a $100 million swing on state tax alone. After combined taxes, a $1 billion lump sum nets roughly in the $500–600 million range depending on the cash value and state. Use the calculator with real numbers for the estimate.",
      },
      {
        question: "Why is the cash option smaller than the advertised jackpot?",
        answer:
          "The advertised $1 billion is the sum of 30 payments spread over decades. The cash option is the present value of that stream — what the prize pool holds today. The gap reflects the time value of money across 30 years, and it moves with interest rates, so no fixed percentage applies.",
      },
      {
        question: "How does a lottery annuity work on $1 billion?",
        answer:
          "Thirty annual payments averaging about $33.33 million before tax (or escalating payments under structures like Mega Millions', where each payment is 5% larger than the last). Each payment is taxed as ordinary income in the year you receive it.",
      },
      {
        question: "Are lottery annuity payments taxable?",
        answer:
          "Yes. Every payment is taxed as ordinary income in the year received — federally always, and by most states. At ~$33 million per payment, each one is taxed at the top rates.",
      },
      {
        question: "Is lottery withholding the same as final tax?",
        answer:
          "No. " +
          SHARED_WITHHOLDING_NOTE +
          " On a billion-dollar win, withholding is a small fraction of the final bill.",
      },
    ],
  },
];

export function getJackpotAmount(slug: string): JackpotAmount | undefined {
  return JACKPOT_AMOUNTS.find((j) => j.slug === slug);
}

export function getAllJackpotAmounts(): JackpotAmount[] {
  return JACKPOT_AMOUNTS;
}

/** Quick-select presets for the payout calculator (populate the jackpot field; no navigation). */
export const PAYOUT_PRESETS: { label: string; amount: number }[] = [
  { label: "$100K", amount: 100_000 },
  { label: "$500K", amount: 500_000 },
  { label: "$1M", amount: 1_000_000 },
  { label: "$5M", amount: 5_000_000 },
  { label: "$10M", amount: 10_000_000 },
  { label: "$50M", amount: 50_000_000 },
  { label: "$100M", amount: 100_000_000 },
  { label: "$500M", amount: 500_000_000 },
  { label: "$1B", amount: 1_000_000_000 },
];
