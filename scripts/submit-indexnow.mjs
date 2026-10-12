// IndexNow submission script for lotterycalculator.site
// Submits all sitemap URLs to Bing / Yandex / IndexNow API.
// The key file public/<KEY>.txt must be deployed live before submitting.

import { readFileSync, existsSync } from "node:fs";

const INDEXNOW_KEY = "66210dc976255bb98bba2a029ccdece9";
const HOST = "lotterycalculator.site";
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

function extractLocs(xml) {
  const locs = [];
  for (const m of xml.matchAll(/<loc>(.*?)<\/loc>/g)) locs.push(m[1].trim());
  return locs;
}

async function submitIndexNow() {
  console.log(`Submitting URLs to IndexNow for host: ${HOST}...`);

  let urlList = [];
  // dist uses a sitemap index (sitemap-index.xml -> sitemap-0.xml)
  if (existsSync("dist/sitemap-index.xml")) {
    const indexXml = readFileSync("dist/sitemap-index.xml", "utf8");
    const sitemapUrls = extractLocs(indexXml);
    for (const smUrl of sitemapUrls) {
      const file = smUrl.split("/").pop();
      const local = `dist/${file}`;
      if (existsSync(local)) {
        urlList.push(...extractLocs(readFileSync(local, "utf8")));
      } else {
        // fallback: fetch the sitemap from the live host
        const res = await fetch(smUrl);
        if (res.ok) urlList.push(...extractLocs(await res.text()));
      }
    }
  } else if (existsSync("dist/sitemap.xml")) {
    urlList = extractLocs(readFileSync("dist/sitemap.xml", "utf8"));
  }

  // Only submit our own host's URLs
  urlList = [...new Set(urlList)].filter((u) => {
    try {
      return new URL(u).hostname === HOST;
    } catch {
      return false;
    }
  });

  console.log(`Prepared ${urlList.length} URLs for IndexNow submission.`);
  if (urlList.length === 0) {
    console.log("Nothing to submit.");
    return;
  }

  const batch = urlList.slice(0, 10000);
  const payload = { host: HOST, key: INDEXNOW_KEY, keyLocation: KEY_LOCATION, urlList: batch };

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  console.log(`IndexNow Response Status: ${res.status} ${res.statusText}`);
  if (res.status === 200 || res.status === 202) {
    console.log(`Successfully submitted ${batch.length} URLs to IndexNow.`);
  } else {
    console.log(await res.text());
    process.exitCode = 1;
  }
}

submitIndexNow().catch((err) => {
  console.error("IndexNow submission failed:", err.message);
  process.exitCode = 1;
});
