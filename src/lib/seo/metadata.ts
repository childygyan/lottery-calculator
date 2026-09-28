/**
 * SEO metadata helpers. Every page builds its meta through buildPageMeta —
 * no hard-coded titles, descriptions, or canonicals in page templates.
 */
import { siteName, siteUrl, siteDescription, defaultOgImage } from "../../data/site.ts";

export interface BreadcrumbItem {
  name: string;
  /** Absolute URL. */
  url: string;
}

export interface PageMetaInput {
  title: string;
  description?: string;
  /** Site path like "/lottery-calculator/" — converted to an absolute canonical. */
  path: string;
  ogType?: "website" | "article";
  ogImage?: string;
  robots?: string;
}

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogType: string;
  ogImage: string;
  robots: string;
  siteName: string;
}

/** Convert a site path to an absolute URL using the configured site URL. */
export function absoluteUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${clean}`;
}

export function buildPageMeta(input: PageMetaInput): PageMeta {
  return {
    title: input.title,
    description: input.description ?? siteDescription,
    canonical: absoluteUrl(input.path),
    ogType: input.ogType ?? "website",
    ogImage: input.ogImage ?? defaultOgImage,
    robots: input.robots ?? "index, follow",
    siteName,
  };
}

/** BreadcrumbList JSON-LD. Only call when the page renders visible breadcrumbs. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  });
}

/** WebSite JSON-LD for the homepage. */
export function websiteJsonLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
  });
}

/** FAQPage JSON-LD. Only call when the page renders the same visible Q&A. */
export function faqJsonLd(faqs: Array<{ question: string; answer: string }>): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  });
}
