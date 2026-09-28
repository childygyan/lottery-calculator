import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import { siteUrl } from "./src/data/site";

// https://astro.build/config
export default defineConfig({
  // Canonical site URL comes from the central site config — never hard-code it elsewhere.
  site: siteUrl,
  integrations: [
    tailwind(),
    sitemap({
      // Keep lottery tool pages indexable; exclude nothing in Phase 1.
    }),
  ],
  vite: {
    build: {
      // Keep the client bundle lean: the calculator ships one small script.
      cssCodeSplit: true,
    },
  },
});
