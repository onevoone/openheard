import { m } from "@openheard/i18n/messages";
import { MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";

import { saveThemeChoice, type ThemeChoice, useVisitorTheme } from "@/lib/visitor-theme";

const NEXT: Record<ThemeChoice, ThemeChoice> = { light: "dark", dark: "auto", auto: "light" };
const LABEL: Record<ThemeChoice, () => string> = { light: () => m.theme_light(), dark: () => m.theme_dark(), auto: () => m.theme_auto() };
const ICON = { light: SunIcon, dark: MoonIcon, auto: MonitorIcon };

// Cycles Light, Dark, Auto on the public board.
export function ThemeSwitch({ workspaceId, fallback }: { workspaceId: string; fallback: "light" | "dark" }) {
  const { choice } = useVisitorTheme(workspaceId, fallback);
  const Icon = ICON[choice];
  const label = m.theme_switch({ current: LABEL[choice](), next: LABEL[NEXT[choice]]().toLocaleLowerCase() });
  return (
    <button
      type="button"
      onClick={() => saveThemeChoice(workspaceId, NEXT[choice])}
      className="inline-flex size-10 items-center justify-center rounded-md text-faint transition-colors hover:bg-accent hover:text-foreground md:size-8"
      aria-label={label}
      title={label}
    >
      <Icon className="size-[18px] md:size-4" />
    </button>
  );
}
