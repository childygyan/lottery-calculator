/**
 * DOM-level smoke test of the built lottery calculator page.
 * Runs the real bundled client script against the real built HTML in jsdom.
 */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const dist = path.join(__dirname, "dist");
const htmlPath = path.join(dist, "lottery-calculator/index.html");
const html = fs.readFileSync(htmlPath, "utf8");

// Find the client bundle the page references
const srcMatch = html.match(/<script type="module" src="([^"]+LotteryCalculator[^"]+)"/);
if (!srcMatch) {
  console.error("FAIL: client bundle script tag not found in HTML");
  process.exit(1);
}
const bundlePath = path.join(dist, srcMatch[1]);
const bundle = fs.readFileSync(bundlePath, "utf8");

const consoleErrors = [];
const dom = new JSDOM(html, {
  url: "http://localhost:8123/lottery-calculator/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
});
const { window } = dom;
window.addEventListener("error", (e) => consoleErrors.push(String(e.message || e.error)));
// jsdom does not implement scrollIntoView (real browsers do); stub it so the
// test exercises the surrounding logic.
window.HTMLElement.prototype.scrollIntoView = function () {};

// Execute the real client bundle in the page context
window.eval(bundle);

const doc = window.document;
let failures = 0;
function check(name, cond, extra = "") {
  if (cond) {
    console.log(`PASS: ${name}`);
  } else {
    failures++;
    console.log(`FAIL: ${name} ${extra}`);
  }
}

function setField(id, value) {
  const el = doc.getElementById(id);
  el.value = value;
  el.dispatchEvent(new window.Event("input", { bubbles: true }));
}
function submit() {
  const form = doc.getElementById("lottery-form");
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
}
const text = (id) => (doc.getElementById(id)?.textContent || "").trim();

// --- Case 1: valid NY calculation ---
setField("jackpot", "100000000");
setField("cashValue", "48000000");
doc.getElementById("state").value = "NY";
submit();

const resultsVisible = !doc.getElementById("lottery-results").hasAttribute("hidden");
check("results shown after valid submit", resultsVisible);
check("jackpot result", text("result-jackpot") === "$100,000,000", `got "${text("result-jackpot")}"`);
check("cash result", text("result-cash") === "$48,000,000", `got "${text("result-cash")}"`);
check("federal tax", text("result-federal") === "$17,717,020", `got "${text("result-federal")}"`);
check("state tax", text("result-state") === "$5,232,000", `got "${text("result-state")}"`);
check("total tax", text("result-total") === "$22,949,020", `got "${text("result-total")}"`);
check("take-home", text("result-takehome") === "$25,050,980", `got "${text("result-takehome")}"`);
check("effective rate", text("result-rate") === "47.81%", `got "${text("result-rate")}"`);

// --- Case 2: empty submit -> validation errors ---
setField("jackpot", "");
setField("cashValue", "");
doc.getElementById("state").value = "";
submit();
check("jackpot error shown", text("jackpot-error") === "Jackpot amount is required.");
check("cash error shown", text("cashValue-error") === "Cash option is required.");
check("state error shown", text("state-error") === "Please choose a state.");
check("focus moved to first invalid field", doc.activeElement?.id === "jackpot", `got "${doc.activeElement?.id}"`);

// --- Case 3: cash > jackpot ---
setField("jackpot", "10000000");
setField("cashValue", "48000000");
doc.getElementById("state").value = "TX";
submit();
check(
  "cash>jackpot error",
  text("cashValue-error") ===
    "The cash option is usually lower than the advertised jackpot — please check both amounts.",
  `got "${text("cashValue-error")}"`
);

// --- Case 4: no-income-tax state (TX) shows $0.00 state tax ---
setField("jackpot", "100000000");
setField("cashValue", "48000000");
doc.getElementById("state").value = "TX";
submit();
check("TX state tax is $0", text("result-state") === "$0", `got "${text("result-state")}"`);

// --- Mobile menu toggle (header inline script) ---
const headerScript = html.match(/<script type="module">([\s\S]*?)<\/script>/g) || [];
const menuScript = headerScript.find((s) => s.includes("menu-button"));
if (menuScript) {
  window.eval(menuScript.replace(/<\/?script[^>]*>/g, ""));
  const btn = doc.getElementById("menu-button");
  const menu = doc.getElementById("mobile-menu");
  const wasHidden = menu.classList.contains("hidden");
  btn.click();
  check("mobile menu opens on tap", wasHidden && !menu.classList.contains("hidden"));
  check("aria-expanded updated", btn.getAttribute("aria-expanded") === "true");
  btn.click();
  check("mobile menu closes on second tap", menu.classList.contains("hidden"));
} else {
  check("mobile menu inline script found", false);
}

check("no uncaught JS errors", consoleErrors.length === 0, JSON.stringify(consoleErrors));

console.log(failures === 0 ? "\nALL DOM SMOKE TESTS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
