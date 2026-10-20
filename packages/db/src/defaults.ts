import type { Locale } from "@openheard/i18n/locales";
import { m } from "@openheard/i18n/messages";

import type { StatusKind } from "./schema/feedback";

// What a new workspace starts with, written in its language. These become
// rows (statuses, board, tagline), so the text is fixed at creation and the
// admin edits it from then on; nothing here is translated at read time.
// Kept out of schema/ because drizzle-kit loads that folder on its own,
// without the generated messages.

export type DefaultStatus = { key: string; label: string; color: string; kind: StatusKind; onRoadmap: boolean };

export function defaultStatuses(locale: Locale): DefaultStatus[] {
  const o = { locale };
  return [
    { key: "open", label: m.default_status_open({}, o), color: "#f2b53d", kind: "open", onRoadmap: false },
    { key: "review", label: m.default_status_review({}, o), color: "#b08cff", kind: "review", onRoadmap: true },
    { key: "planned", label: m.default_status_planned({}, o), color: "#f2b53d", kind: "planned", onRoadmap: true },
    { key: "progress", label: m.default_status_progress({}, o), color: "#6e8bff", kind: "progress", onRoadmap: true },
    { key: "done", label: m.default_status_done({}, o), color: "#3ecf8e", kind: "done", onRoadmap: true },
    { key: "closed", label: m.default_status_closed({}, o), color: "#7a7a85", kind: "closed", onRoadmap: false },
  ];
}

export const defaultTagline = (locale: Locale) => m.default_tagline({}, { locale });

export function defaultBoard(locale: Locale) {
  return { name: m.default_board_name({}, { locale }), description: m.default_board_description({}, { locale }) };
}
