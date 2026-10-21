import { describe, expect, it } from "vitest";

import { activityNote, encodeNote } from "./activity-note";

describe("activityNote", () => {
  it("words a merge in the language asked for and keeps the title as it was typed", () => {
    const merged = { type: "merge", note: 'merged "Dark mode" into this, +2 votes', noteData: encodeNote({ code: "merged_into_this", title: "Dark mode", votes: 2 }) };
    expect(activityNote(merged, "en")).toBe('merged "Dark mode" into this, +2 votes');
    expect(activityNote(merged, "uk")).toBe("ідею «Dark mode» об'єднано з цією, +2 голоси");
    expect(activityNote({ ...merged, noteData: encodeNote({ code: "merged_into_this", title: "Dark mode", votes: 1 }) }, "en")).toBe('merged "Dark mode" into this, +1 vote');
    expect(activityNote({ ...merged, noteData: encodeNote({ code: "merged_into_this", title: "Dark mode", votes: 5 }) }, "uk")).toBe("ідею «Dark mode» об'єднано з цією, +5 голосів");
    const into = { type: "merge", note: 'merged into "Dark mode"', noteData: encodeNote({ code: "merged_into", title: "Dark mode" }) };
    expect(activityNote(into, "en")).toBe('merged into "Dark mode"');
    expect(activityNote(into, "uk")).toBe("об'єднано з ідеєю «Dark mode»");
  });

  it("words shipping and pinning", () => {
    const shipped = { type: "status", note: "shipped in v2.1", noteData: encodeNote({ code: "shipped", name: "v2.1" }) };
    expect(activityNote(shipped, "en")).toBe("shipped in v2.1");
    expect(activityNote(shipped, "uk")).toBe("випущено: v2.1");
    const pinned = { type: "pin", note: "pinned", noteData: encodeNote({ code: "pinned" }) };
    expect(activityNote(pinned, "en")).toBe("pinned");
    expect(activityNote(pinned, "uk")).toBe("закріплено");
    expect(activityNote({ type: "pin", note: "unpinned", noteData: encodeNote({ code: "unpinned" }) }, "uk")).toBe("відкріплено");
  });

  it("shows what the team typed as it is, and old or odd rows by their stored text", () => {
    expect(activityNote({ type: "status", note: "Started on this.", noteData: null }, "uk")).toBe("Started on this.");
    expect(activityNote({ type: "pin", note: "pinned", noteData: null }, "uk")).toBe("закріплено");
    expect(activityNote({ type: "merge", note: 'merged into "X"', noteData: "not json" }, "uk")).toBe('merged into "X"');
    expect(activityNote({ type: "merge", note: "kept", noteData: '{"code":"merged_into"}' }, "uk")).toBe("kept");
    expect(activityNote({ type: "merge", note: "kept", noteData: '{"code":"nope"}' }, "uk")).toBe("kept");
    expect(activityNote({ type: "status", note: null }, "uk")).toBeNull();
  });
});
