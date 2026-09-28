/** Site navigation. Only pages that exist are listed — no broken links. */

export interface NavItem {
  label: string;
  href: string;
}

export const mainNav: NavItem[] = [
  { label: "Lottery Calculator", href: "/lottery-calculator/" },
  { label: "Lottery Tax Calculator", href: "/lottery-tax-calculator/" },
  { label: "About", href: "/about/" },
];

export const footerNav: NavItem[] = [
  { label: "Lottery Calculator", href: "/lottery-calculator/" },
  { label: "Lottery Tax Calculator", href: "/lottery-tax-calculator/" },
  { label: "Powerball Calculator", href: "/powerball-calculator/" },
  { label: "Powerball Tax Calculator", href: "/powerball-tax-calculator/" },
  { label: "Mega Millions Calculator", href: "/mega-millions-calculator/" },
  { label: "Mega Millions Tax Calculator", href: "/mega-millions-tax-calculator/" },
  { label: "Lottery Payout Calculator", href: "/lottery-payout-calculator/" },
  { label: "Lottery Annuity Calculator", href: "/lottery-annuity-calculator/" },
  { label: "Lottery Cash Option Calculator", href: "/lottery-cash-option-calculator/" },
  { label: "Lottery Odds Calculator", href: "/lottery-odds-calculator/" },
  { label: "Lottery Probability Calculator", href: "/lottery-probability-calculator/" },
  { label: "Powerball Odds Calculator", href: "/powerball-odds-calculator/" },
  { label: "Mega Millions Odds Calculator", href: "/mega-millions-odds-calculator/" },
  { label: "Lottery Number Generator", href: "/lottery-number-generator/" },
  { label: "Powerball Number Generator", href: "/powerball-number-generator/" },
  { label: "Mega Millions Number Generator", href: "/mega-millions-number-generator/" },
  { label: "Lottery Combination Generator", href: "/lottery-combination-generator/" },
  { label: "About", href: "/about/" },
  { label: "Contact", href: "/contact/" },
  { label: "Privacy Policy", href: "/privacy/" },
  { label: "Terms", href: "/terms/" },
  { label: "Disclaimer", href: "/disclaimer/" },
];
