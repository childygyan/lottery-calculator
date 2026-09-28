/**
 * Shared loader for built-DOM tests.
 *
 * The client bundles are real ES modules that Vite splits into shared chunks
 * (e.g. `./lottery.CeRaeDjB.js`). `vm.runInContext` cannot execute `import`
 * statements, so this loader instead:
 *   1. builds a JSDOM page with the requested URL,
 *   2. exposes the JSDOM window's globals on Node's globalThis,
 *   3. dynamic-imports the built entry module (relative chunk imports resolve
 *      naturally), then restores the globals.
 *
 * The module's top-level code runs exactly as it would in a browser.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DIST = join(ROOT, "dist");

export interface LoadedPage {
  dom: JSDOM;
  doc: Document;
}

let importCounter = 0;

const GLOBAL_NAMES = [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLFormElement",
  "HTMLInputElement",
  "HTMLSelectElement",
  "HTMLButtonElement",
  "FormData",
  "URLSearchParams",
  "URL",
  "Event",
  "CustomEvent",
  "Node",
  "Element",
] as const;

export async function loadInteractivePage(
  distPath: string,
  url: string,
  scriptSelector = 'script[type="module"][src]',
): Promise<LoadedPage> {
  let html: string;
  try {
    html = readFileSync(join(DIST, distPath), "utf8");
  } catch {
    throw new Error(`dist/ missing — run \`npm run build\` before DOM tests (wanted ${distPath}).`);
  }
  const dom = new JSDOM(html, { url });
  const { window } = dom;
  const doc = window.document;

  const src = (doc.querySelector(scriptSelector) as HTMLScriptElement | null)?.getAttribute(
    "src",
  );
  assert.ok(src, `bundled module script (${scriptSelector}) exists on ${distPath}`);

  const g = globalThis as Record<string, unknown>;
  const saved: Record<string, PropertyDescriptor | undefined> = {};
  for (const name of GLOBAL_NAMES) {
    saved[name] = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, {
      value: (window as unknown as Record<string, unknown>)[name],
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  // NOTE: globals intentionally stay pointed at this page after import.
  // The bundled handlers look up `document` at call time, so restoring the
  // globals here would break every submit/click. Each test loads its own
  // page first, which re-points the globals before any interaction.
  const fileUrl = pathToFileURL(join(DIST, src.replace(/^\//, ""))).href;
  // Cache-bust so every test gets a fresh module (fresh listeners).
  await import(`${fileUrl}?t=${++importCounter}`);
  return { dom, doc };
}

/** Read a built page's HTML without executing anything. */
export function pageHtml(distPath: string): string {
  try {
    return readFileSync(join(DIST, distPath), "utf8");
  } catch {
    throw new Error(`dist/ missing — run \`npm run build\` before DOM tests (wanted ${distPath}).`);
  }
}

export function setValue(doc: Document, id: string, value: string): void {
  const el = doc.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  assert.ok(el, `element #${id} exists`);
  el.value = value;
}

export function submitForm(dom: JSDOM, doc: Document, formId: string): void {
  const form = doc.getElementById(formId) as HTMLFormElement | null;
  assert.ok(form, `form #${formId} exists`);
  form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
}

export function clickButton(dom: JSDOM, doc: Document, id: string): void {
  const button = doc.getElementById(id) as HTMLButtonElement | null;
  assert.ok(button, `button #${id} exists`);
  button.dispatchEvent(new dom.window.Event("click", { bubbles: true, cancelable: true }));
}
