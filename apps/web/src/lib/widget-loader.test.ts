// @vitest-environment jsdom
// The loader script on a host page: a tab asked for before the frame is ready
// must not outlive the open that asked for it, and the words it says itself
// come in the visitor's language.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, expect, it, vi } from "vitest";

import { loaderStrings } from "./widget-settings";

const SOURCE = readFileSync(join(__dirname, "widget-loader.js"), "utf8");
const ORIGIN = "https://feedback.example.test";

type Api = (cmd: string, arg?: string) => void;

function load(dataset: Record<string, string> = {}) {
  const script = document.createElement("script");
  script.src = ORIGIN + "/widget.js";
  Object.assign(script.dataset, dataset);
  document.head.appendChild(script);
  let frame: HTMLIFrameElement | undefined;
  const create = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation(((tag: string, opts?: ElementCreationOptions) => {
    const el = create(tag, opts);
    if (tag === "iframe") frame = el as HTMLIFrameElement;
    return el;
  }) as typeof document.createElement);
  // jsdom gives no window to a frame inside a shadow root, so render in place.
  vi.spyOn(Element.prototype, "attachShadow").mockImplementation(function (this: Element) {
    return this as unknown as ShadowRoot;
  });
  new Function(SOURCE)();
  const api = (window as unknown as { openheard: Api }).openheard;
  return {
    api,
    ready() {
      if (!frame?.contentWindow) throw new Error("no frame");
      const sent = vi.spyOn(frame.contentWindow, "postMessage");
      window.dispatchEvent(new MessageEvent("message", { data: { type: "openheard:ready" }, origin: ORIGIN, source: frame.contentWindow }));
      return sent.mock.calls.map((c) => c[0] as { type: string; tab?: string; home?: boolean });
    },
    frameSrc: () => frame?.src ?? "",
    launcher: () => document.querySelector<HTMLButtonElement>("button.l")!,
    panel: () => document.querySelector<HTMLElement>(".p")!,
  };
}

const META = {
  defaultLocale: "uk",
  strings: { uk: loaderStrings("uk"), en: loaderStrings("en") },
  label: null,
  launcher: "icon",
  tabs: ["feedback"],
  changelog: false,
};

// The loader reads /widget.json once; let that promise chain finish.
async function withMeta<T>(meta: object | null, run: () => T): Promise<T> {
  vi.stubGlobal("fetch", () => Promise.resolve({ ok: !!meta, json: () => Promise.resolve(meta) }));
  const out = run();
  await new Promise((r) => setTimeout(r, 0));
  return out;
}

function browserLanguages(...tags: string[]) {
  vi.spyOn(navigator, "languages", "get").mockReturnValue(tags);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal("fetch", () => new Promise(() => {}));
  delete (window as unknown as Record<string, unknown>).__openheardWidget;
  delete (window as unknown as Record<string, unknown>).openheard;
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

it("drops a queued tab when the widget closes and reopens with none before the frame is ready", () => {
  const w = load();
  w.api("open", "changelog");
  expect(w.frameSrc()).toContain("tab=changelog");
  w.api("close");
  w.api("open");
  const opens = w.ready().filter((m) => m.type === "openheard:open");
  expect(opens).toHaveLength(1);
  expect(opens[0].tab).toBeUndefined();
  // The frame was first loaded for changelog, so it is told to go back to the first tab.
  expect(opens[0].home).toBe(true);
});

it("still opens on a tab asked for before the frame is ready", () => {
  const w = load();
  w.api("open", "roadmap");
  const opens = w.ready().filter((m) => m.type === "openheard:open");
  expect(opens).toHaveLength(1);
  expect(opens[0].tab).toBe("roadmap");
  expect(opens[0].home).toBe(false);
});

// A second loader on a fresh page, in the same test.
function again() {
  vi.restoreAllMocks();
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  delete (window as unknown as Record<string, unknown>).__openheardWidget;
  delete (window as unknown as Record<string, unknown>).openheard;
}

it("says its words in English until /widget.json arrives, or when it fails", async () => {
  const w = await withMeta(null, () => load());
  expect(w.launcher().getAttribute("aria-label")).toBe("Open feedback");
  expect(w.panel().getAttribute("aria-label")).toBe("Feedback");
});

it("follows the browser's language, then the workspace's", async () => {
  browserLanguages("uk-UA", "en");
  let w = await withMeta(META, () => load());
  expect(w.launcher().getAttribute("aria-label")).toBe("Відкрити: відгуки");
  expect(w.panel().getAttribute("aria-label")).toBe("Відгуки");
  expect(w.launcher().textContent).toContain("нове");

  again();
  browserLanguages("de-DE", "fr");
  w = await withMeta({ ...META, defaultLocale: "en" }, () => load());
  expect(w.launcher().getAttribute("aria-label")).toBe("Open feedback");
});

it("lets data-lang win over the browser, and skips a language it has no words for", async () => {
  browserLanguages("uk-UA");
  let w = await withMeta(META, () => load({ lang: "en" }));
  expect(w.launcher().getAttribute("aria-label")).toBe("Open feedback");

  again();
  browserLanguages("uk-UA");
  w = await withMeta(META, () => load({ lang: "xx" }));
  expect(w.launcher().getAttribute("aria-label")).toBe("Відкрити: відгуки");
});

it("uses the default label in the visitor's language, and a saved label as it is", async () => {
  browserLanguages("en-US");
  let w = await withMeta({ ...META, launcher: "label", label: null }, () => load());
  expect(w.launcher().querySelector(".t")!.textContent).toBe("Feedback");
  expect(w.launcher().getAttribute("aria-label")).toBe("Open Feedback");

  again();
  browserLanguages("en-US");
  w = await withMeta({ ...META, launcher: "label", label: "Ідеї" }, () => load());
  expect(w.launcher().querySelector(".t")!.textContent).toBe("Ідеї");
  expect(w.launcher().getAttribute("aria-label")).toBe("Open Ідеї");
});

it("passes its languages to the panel, data-lang first", () => {
  browserLanguages("de-DE", "uk-UA", "en");
  const w = load({ lang: "en-GB" });
  w.api("open");
  expect(new URL(w.frameSrc()).searchParams.get("lang")).toBe("en,de,uk");
});
