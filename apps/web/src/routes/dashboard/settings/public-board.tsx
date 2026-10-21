import { m } from "@openheard/i18n/messages";
import { LoadingButton } from "@openheard/ui/components/interior/loading-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@openheard/ui/components/dropdown-menu";
import { CaretDownIcon } from "@phosphor-icons/react";
import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Row, SectionHead, Toggle } from "@/components/admin/panel";
import { saveWorkspace } from "@/functions/settings";
import { PageHead } from "@/routes/dashboard/settings";

export const Route = createFileRoute("/dashboard/settings/public-board")({
  head: () => ({ meta: [{ title: m.settings_public_meta() }] }),
  component: PublicBoard,
});

const themeLabel = (t: "dark" | "light") => (t === "dark" ? m.settings_theme_dark() : m.settings_theme_light());

function PublicBoard() {
  const root = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const ws = root.workspace;
  const [theme, setTheme] = useState<"dark" | "light">(ws.theme === "light" ? "light" : "dark");
  const [poweredBy, setPoweredBy] = useState(ws.poweredBy);
  const dirty = theme !== (ws.theme === "light" ? "light" : "dark") || poweredBy !== ws.poweredBy;

  function save() {
    saveWorkspace({ data: { name: ws.name, tagline: ws.tagline, theme, poweredBy, requireApproval: ws.requireApproval, accent: ws.accent } })
      .then(() => router.invalidate())
      .catch((err) => toast.error(err instanceof Error ? err.message : m.settings_save_failed()));
  }

  return (
    <>
      <PageHead title={m.settings_public_title()} sub={m.settings_public_sub()} />
      <SectionHead title={m.settings_appearance()} />
      <Row label={m.settings_public_theme_label()} help={m.settings_public_theme_help()}>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-[30px] items-center gap-2 rounded-md border border-input bg-card pr-2 pl-2.5 text-[13px] outline-none hover:bg-accent">
            {themeLabel(theme)} <CaretDownIcon className="size-2.5 text-faint" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-32">
            {(["dark", "light"] as const).map((t) => (
              <DropdownMenuItem key={t} onClick={() => setTheme(t)}>
                {themeLabel(t)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
      <div className="pt-7">
        <SectionHead title={m.settings_public_footer()} />
      </div>
      <Row label={m.settings_public_powered_label()} help={m.settings_public_powered_help()}>
        <Toggle on={poweredBy} onChange={setPoweredBy} label={m.settings_public_powered_aria()} />
      </Row>
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <span className="text-xs text-faint">{dirty ? m.settings_unsaved() : m.settings_saved()}</span>
        <LoadingButton onAction={save} disabled={!dirty} successLabel={m.settings_saved()} onError={(err) => toast.error(err instanceof Error ? err.message : m.settings_save_failed())}>
          {m.settings_save()}
        </LoadingButton>
      </div>
    </>
  );
}
