import type { Locale } from "@openheard/i18n/locales";
import { m } from "@openheard/i18n/messages";

// Notes the app writes on a post's timeline itself. The English text goes in
// `activity.note`, which the REST API and MCP return as it is; the same note
// goes in `activity.noteData` as JSON, so the dashboard and the public post
// word it in the reader's language when they draw it. A note the team typed
// has no data and is shown as written.
export type ActivityNoteData =
  | { code: "pinned" }
  | { code: "unpinned" }
  | { code: "merged_into"; title: string }
  | { code: "merged_into_this"; title: string; votes: number }
  | { code: "shipped"; name: string };

export const encodeNote = (data: ActivityNoteData): string => JSON.stringify(data);

function decode(raw: string | null | undefined): ActivityNoteData | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    switch (v.code) {
      case "pinned":
      case "unpinned":
        return { code: v.code };
      case "merged_into":
        return typeof v.title === "string" ? { code: v.code, title: v.title } : null;
      case "merged_into_this":
        return typeof v.title === "string" && typeof v.votes === "number" ? { code: v.code, title: v.title, votes: v.votes } : null;
      case "shipped":
        return typeof v.name === "string" ? { code: v.code, name: v.name } : null;
    }
  } catch {
    // not JSON: a row from outside the app
  }
  return null;
}

// The text to show for a timeline row's note. Titles and names are dropped in
// as they are, inside quotes or after a colon, never inflected.
export function activityNote(item: { type?: string; note?: string | null; noteData?: string | null }, locale?: Locale): string | null {
  const o = { locale };
  const d = decode(item.noteData);
  if (d) {
    switch (d.code) {
      case "pinned":
        return m.post_activity_pinned({}, o);
      case "unpinned":
        return m.post_activity_unpinned({}, o);
      case "merged_into":
        return m.activity_merged_into({ title: d.title }, o);
      case "merged_into_this":
        return m.activity_merged_into_this({ title: d.title, votes: d.votes }, o);
      case "shipped":
        return m.activity_shipped({ name: d.name }, o);
    }
  }
  // Pins written before noteData existed are the bare words.
  if (item.type === "pin") {
    if (item.note === "pinned") return m.post_activity_pinned({}, o);
    if (item.note === "unpinned") return m.post_activity_unpinned({}, o);
  }
  return item.note ?? null;
}
