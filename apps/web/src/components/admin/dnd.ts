import type { Announcements, ScreenReaderInstructions } from "@dnd-kit/core";
import { m } from "@openheard/i18n/messages";

// dnd-kit's screen reader texts, in the reader's language. Same wording as the
// library's English defaults. Call while rendering, not at module load.
export function dndAccessibility(): { announcements: Announcements; screenReaderInstructions: ScreenReaderInstructions } {
  return {
    screenReaderInstructions: { draggable: m.dash_dnd_instructions() },
    announcements: {
      onDragStart: ({ active }) => m.dash_dnd_start({ id: active.id }),
      onDragOver: ({ active, over }) => (over ? m.dash_dnd_over({ id: active.id, overId: over.id }) : m.dash_dnd_over_none({ id: active.id })),
      onDragEnd: ({ active, over }) => (over ? m.dash_dnd_end({ id: active.id, overId: over.id }) : m.dash_dnd_end_none({ id: active.id })),
      onDragCancel: ({ active }) => m.dash_dnd_cancel({ id: active.id }),
    },
  };
}
