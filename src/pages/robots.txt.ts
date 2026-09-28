import type { APIRoute } from "astro";
import { siteUrl } from "../data/site.ts";

/**
 * robots.txt generated from the central site config —
 * the sitemap URL always matches the configured domain.
 */
export const GET: APIRoute = () => {
  const body = [`User-agent: *`, `Allow: /`, ``, `Sitemap: ${siteUrl}/sitemap-index.xml`, ``].join(
    "\n",
  );
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
