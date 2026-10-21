import { BASE_LOCALE, LOCALES, type Locale, isLocale } from "@openheard/i18n/locales";
import { m } from "@openheard/i18n/messages";
import { z } from "zod";

// How the widget looks and which tabs it shows, saved per workspace in
// workspace.widget_settings. The loader reads them from /widget.json, so a
// change lands on every site without touching the snippet; data-* attributes
// on the script tag still win.

export const WIDGET_THEMES = ["dark", "light", "auto"] as const;
export const WIDGET_LAUNCHERS = ["icon", "label", "hidden"] as const;
export const WIDGET_ICONS = ["chat", "lightbulb", "megaphone", "question", "sparkle"] as const;
export const WIDGET_POSITIONS = ["bottom-right", "bottom-left"] as const;
export const WIDGET_RADII = ["sharp", "soft", "round"] as const;
export const WIDGET_TABS = ["feedback", "roadmap", "changelog"] as const;
export const WIDGET_LABEL_MAX = 24;
export const DEFAULT_ACCENT = "#6e8bff";

export type WidgetTheme = (typeof WIDGET_THEMES)[number];
export type WidgetLauncher = (typeof WIDGET_LAUNCHERS)[number];
export type WidgetIcon = (typeof WIDGET_ICONS)[number];
export type WidgetPosition = (typeof WIDGET_POSITIONS)[number];
export type WidgetRadius = (typeof WIDGET_RADII)[number];
export type WidgetTabName = (typeof WIDGET_TABS)[number];

// The messages are callbacks, so they are worded when a value is checked, in
// the language of that request (or of `locale`, for callers that must not
// follow it, like the MCP server), never when this module loads.
export const widgetSettingsSchemaFor = (locale?: Locale) =>
  z.object({
    theme: z.enum(WIDGET_THEMES),
    // null follows the workspace brand accent.
    accent: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, { error: () => m.err_widget_accent_invalid({}, { locale }) })
      .transform((s) => s.toLowerCase())
      .nullable(),
    launcher: z.enum(WIDGET_LAUNCHERS),
    label: z
      .string()
      .trim()
      .min(1, { error: () => m.err_widget_label_empty({}, { locale }) })
      .max(WIDGET_LABEL_MAX, { error: () => m.err_widget_label_long({ max: WIDGET_LABEL_MAX }, { locale }) }),
    icon: z.enum(WIDGET_ICONS),
    position: z.enum(WIDGET_POSITIONS),
    radius: z.enum(WIDGET_RADII),
    // In display order; the first one opens by default.
    tabs: z
      .array(z.enum(WIDGET_TABS))
      .min(1, { error: () => m.err_widget_tabs_min({}, { locale }) })
      .transform((t) => WIDGET_TABS.filter((name) => t.includes(name))),
  });

export const widgetSettingsSchema = widgetSettingsSchemaFor();

export type WidgetSettings = z.output<typeof widgetSettingsSchema>;

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  theme: "dark",
  accent: null,
  launcher: "icon",
  label: "Feedback",
  icon: "chat",
  position: "bottom-right",
  radius: "soft",
  tabs: [...WIDGET_TABS],
};

// Whatever is stored, field by field: a bad or missing value falls back to
// its default instead of throwing away the rest. The default label is a word
// in the board's language, so a caller that knows it passes `locale`.
export function readWidgetSettings(stored: unknown, locale?: Locale): WidgetSettings {
  const raw = stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  const shape = widgetSettingsSchema.shape;
  const out = { ...DEFAULT_WIDGET_SETTINGS } as Record<string, unknown>;
  for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
    if (!(key in raw)) continue;
    const parsed = shape[key].safeParse(raw[key]);
    if (parsed.success) out[key] = parsed.data;
  }
  if (locale && !hasLabel(stored)) out.label = defaultLabel(locale);
  return out as WidgetSettings;
}

// The launcher text nobody typed: "Feedback", "Відгуки".
export function defaultLabel(locale: Locale): string {
  return m.widget_loader_default_label({}, { locale });
}

// Whether an admin (or the MCP server) ever saved a launcher label.
function hasLabel(stored: unknown): boolean {
  const raw = stored && typeof stored === "object" ? (stored as Record<string, unknown>).label : undefined;
  return widgetSettingsSchema.shape.label.safeParse(raw).success;
}

type WorkspaceLike = { accent: string | null; showRoadmap: boolean; showChangelog: boolean; widgetSettings?: unknown; locale?: string | null };

// The tabs a visitor actually gets: the widget's own choice, minus what the
// workspace hides everywhere. Never empty.
export function widgetTabs(ws: WorkspaceLike, settings = readWidgetSettings(ws.widgetSettings)): WidgetTabName[] {
  const tabs = settings.tabs.filter((t) => (t === "roadmap" ? ws.showRoadmap : t === "changelog" ? ws.showChangelog : true));
  return tabs.length ? tabs : ["feedback"];
}

// The few words the loader says itself (button names for screen readers, the
// badge, the default label). The loader is a static script with no access to
// the message runtime, so /widget.json carries them for every language and
// the loader picks one. `{name}` stays a placeholder for the loader to fill.
export function loaderStrings(locale: Locale) {
  const o = { locale };
  const name = "{name}";
  return {
    name: m.widget_loader_name({}, o),
    defaultLabel: defaultLabel(locale),
    panel: m.widget_loader_panel({}, o),
    badge: m.widget_loader_badge({}, o),
    open: m.widget_loader_open({ name }, o),
    openNew: m.widget_loader_open_new({ name }, o),
    close: m.widget_loader_close({ name }, o),
  };
}

// The public body of /widget.json. Everything here is safe for any origin, and
// nothing depends on who asks: the response is cached once per workspace.
export function widgetMeta(ws: WorkspaceLike & { name: string }, latestChangelogAt: number | null) {
  const s = readWidgetSettings(ws.widgetSettings);
  const tabs = widgetTabs(ws, s);
  return {
    name: ws.name,
    // The board's language, for visitors whose own the loader has no words for.
    defaultLocale: isLocale(ws.locale) ? ws.locale : BASE_LOCALE,
    strings: Object.fromEntries(LOCALES.map((locale) => [locale, loaderStrings(locale)])),
    accent: s.accent ?? ws.accent ?? DEFAULT_ACCENT,
    theme: s.theme,
    launcher: s.launcher,
    // Null until someone writes one: the loader then uses its default in the
    // visitor's language rather than a word fixed in the board's.
    label: hasLabel(ws.widgetSettings) ? s.label : null,
    icon: s.icon,
    position: s.position,
    radius: s.radius,
    tabs,
    changelog: tabs.includes("changelog"),
    latestChangelogAt: tabs.includes("changelog") ? latestChangelogAt : null,
  };
}
