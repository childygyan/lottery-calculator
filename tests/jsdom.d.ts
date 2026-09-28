// Minimal structural declaration for the jsdom API surface used in
// tests/dom.test.ts — keeps strict tsc clean without new dependencies.
declare module "jsdom" {
  export class JSDOM {
    constructor(html: string, options?: Record<string, unknown>);
    window: any;
  }
}
