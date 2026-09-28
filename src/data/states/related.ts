/**
 * Related-state navigation for /lottery-tax-calculator/[state]/.
 *
 * Geographically meaningful neighbors only — never all 51 links.
 * Keys and values are state slugs (see StateTaxRule.slug).
 */
export const RELATED_STATES: Record<string, string[]> = {
  alabama: ["mississippi", "tennessee", "georgia", "florida"],
  alaska: ["washington", "oregon"],
  arizona: ["california", "nevada", "utah", "new-mexico"],
  arkansas: ["texas", "oklahoma", "louisiana", "missouri"],
  california: ["oregon", "nevada", "arizona"],
  colorado: ["wyoming", "new-mexico", "utah", "kansas"],
  connecticut: ["new-york", "massachusetts", "rhode-island"],
  delaware: ["maryland", "pennsylvania", "new-jersey"],
  "district-of-columbia": ["maryland", "virginia"],
  florida: ["georgia", "alabama"],
  georgia: ["florida", "alabama", "tennessee", "south-carolina"],
  hawaii: ["california", "nevada"],
  idaho: ["washington", "oregon", "montana", "nevada"],
  illinois: ["wisconsin", "indiana", "iowa", "missouri"],
  indiana: ["illinois", "michigan", "ohio", "kentucky"],
  iowa: ["minnesota", "wisconsin", "illinois", "nebraska"],
  kansas: ["nebraska", "missouri", "oklahoma", "colorado"],
  kentucky: ["tennessee", "indiana", "ohio", "virginia"],
  louisiana: ["texas", "arkansas", "mississippi"],
  maine: ["new-hampshire", "massachusetts"],
  maryland: ["virginia", "pennsylvania", "delaware", "district-of-columbia"],
  massachusetts: ["connecticut", "new-york", "new-hampshire", "rhode-island"],
  michigan: ["ohio", "indiana", "wisconsin"],
  minnesota: ["wisconsin", "iowa", "north-dakota", "south-dakota"],
  mississippi: ["louisiana", "arkansas", "tennessee", "alabama"],
  missouri: ["illinois", "tennessee", "arkansas", "kansas"],
  montana: ["idaho", "wyoming", "north-dakota"],
  nebraska: ["kansas", "colorado", "iowa", "south-dakota"],
  nevada: ["california", "oregon", "idaho", "utah", "arizona"],
  "new-hampshire": ["maine", "massachusetts", "vermont"],
  "new-jersey": ["new-york", "pennsylvania", "connecticut"],
  "new-mexico": ["texas", "arizona", "colorado"],
  "new-york": ["new-jersey", "pennsylvania", "connecticut", "massachusetts"],
  "north-carolina": ["virginia", "tennessee", "georgia", "south-carolina"],
  "north-dakota": ["minnesota", "south-dakota", "montana"],
  ohio: ["pennsylvania", "west-virginia", "kentucky", "indiana", "michigan"],
  oklahoma: ["texas", "kansas", "arkansas", "new-mexico"],
  oregon: ["washington", "california", "idaho", "nevada"],
  pennsylvania: ["new-york", "new-jersey", "ohio", "maryland"],
  "rhode-island": ["massachusetts", "connecticut"],
  "south-carolina": ["north-carolina", "georgia"],
  "south-dakota": ["north-dakota", "minnesota", "iowa", "nebraska"],
  tennessee: ["kentucky", "georgia", "alabama", "mississippi"],
  texas: ["oklahoma", "louisiana", "arkansas", "new-mexico"],
  utah: ["nevada", "arizona", "colorado", "idaho"],
  vermont: ["new-hampshire", "massachusetts", "new-york"],
  virginia: ["north-carolina", "west-virginia", "maryland", "kentucky"],
  washington: ["oregon", "idaho"],
  "west-virginia": ["virginia", "ohio", "kentucky", "pennsylvania", "maryland"],
  wisconsin: ["michigan", "minnesota", "iowa", "illinois"],
  wyoming: ["montana", "colorado", "utah", "idaho"],
};

/** Neighbor slugs for a state; empty array for unknown slugs. */
export function getRelatedSlugs(slug: string): string[] {
  return RELATED_STATES[slug] ?? [];
}
