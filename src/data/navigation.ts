/** Site navigation. Only pages that exist are listed — no broken links. */

export interface NavItem {
  label: string;
  href: string;
}

export const mainNav: NavItem[] = [
  { label: "Lottery Calculator", href: "/lottery-calculator/" },
  { label: "About", href: "/about/" },
];

export const footerNav: NavItem[] = [
  { label: "Lottery Calculator", href: "/lottery-calculator/" },
  { label: "About", href: "/about/" },
  { label: "Contact", href: "/contact/" },
  { label: "Privacy Policy", href: "/privacy/" },
  { label: "Terms", href: "/terms/" },
  { label: "Disclaimer", href: "/disclaimer/" },
];
