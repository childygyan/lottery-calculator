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
  { label: "About", href: "/about/" },
  { label: "Contact", href: "/contact/" },
  { label: "Privacy Policy", href: "/privacy/" },
  { label: "Terms", href: "/terms/" },
  { label: "Disclaimer", href: "/disclaimer/" },
];
