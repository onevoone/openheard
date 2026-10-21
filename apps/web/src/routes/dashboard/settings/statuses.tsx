import { m } from "@openheard/i18n/messages";
import { STATUS_KINDS } from "@openheard/db/schema/feedback";
import type { StatusKind } from "@openheard/db/schema/feedback";
import { Button } from "@openheard/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@openheard/ui/components/dropdown-menu";
import { CaretDownIcon, CaretUpIcon, CheckIcon, DotsThreeIcon, PlusIcon } from "@phosphor-icons/react";
import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SectionHead, Toggle } from "@/components/admin/panel";
import { deleteStatus, reorderStatuses, saveStatus } from "@/functions/statuses";
import type { StatusInfo } from "@/lib/status";
import { PageHead } from "@/routes/dashboard/settings";
import { cn } from "@openheard/ui/lib/utils";

export const Route = createFileRoute("/dashboard/settings/statuses")({
  head: () => ({ meta: [{ title: m.settings_statuses_meta() }] }),
  component: Statuses,
});

const KIND_NAME: Record<StatusKind, () => string> = {
  open: () => m.settings_kind_open(),
  review: () => m.settings_kind_review(),
  planned: () => m.settings_kind_planned(),
  progress: () => m.settings_kind_progress(),
  done: () => m.settings_kind_done(),
  closed: () => m.settings_kind_closed(),
};

const KIND_HELP: Record<StatusKind, () => string> = {
  open: () => m.settings_kind_open_help(),
  review: () => m.settings_kind_review_help(),
  planned: () => m.settings_kind_planned_help(),
  progress: () => m.settings_kind_progress_help(),
  done: () => m.settings_kind_done_help(),
  closed: () => m.settings_kind_closed_help(),
};

const SWATCHES = ["#f2b53d", "#b08cff", "#6e8bff", "#3ecf8e", "#e0705f", "#5fc8e0", "#ff8fab", "#7a7a85"];

function Statuses() {
  const root = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  function fire<T>(fn: () => Promise<T>, ok?: string) {
    if (ok) toast.success(ok);
    fn()
      .then(() => router.invalidate())
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : m.settings_action_failed());
        router.invalidate();
      });
  }

  function move(key: string, dir: -1 | 1) {
    const keys = root.statuses.map((s) => s.key);
    const i = keys.indexOf(key);
    const j = i + dir;
    if (j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j]!, keys[i]!];
    fire(() => reorderStatuses({ data: { keys } }));
  }

  return (
    <>
      <PageHead title={m.settings_statuses_title()} sub={m.settings_statuses_sub()} />
      <SectionHead
        title={m.settings_statuses_title()}
        right={
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <PlusIcon weight="bold" className="size-3" /> {m.settings_statuses_new()}
          </Button>
        }
      />
      {root.statuses.map((s, i) => (
        <StatusRow
          key={s.key}
          status={s}
          count={root.statusCounts[s.key] ?? 0}
          first={i === 0}
          last={i === root.statuses.length - 1}
          onMove={(d) => move(s.key, d)}
          onSave={(patch) => fire(() => saveStatus({ data: { key: s.key, ...patch } }), m.settings_saved())}
          onDelete={() => confirm(m.settings_statuses_delete_confirm({ name: s.label })) && fire(() => deleteStatus({ data: { key: s.key } }), m.settings_statuses_deleted())}
        />
      ))}
      {adding ? (
        <StatusRow
          status={{ key: "", label: "", color: "#6e8bff", kind: "planned", position: 99, onRoadmap: true }}
          count={0}
          editing
          onSave={(patch) => { fire(() => saveStatus({ data: patch }), m.settings_statuses_added()); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      ) : null}
      <p className="pt-4 text-xs text-faint">{m.settings_statuses_footnote()}</p>
    </>
  );
}

type Patch = { label: string; color: string; kind: StatusKind; onRoadmap: boolean };

function StatusRow({
  status,
  count,
  first,
  last,
  editing: initialEditing,
  onMove,
  onSave,
  onDelete,
  onCancel,
}: {
  status: StatusInfo;
  count: number;
  first?: boolean;
  last?: boolean;
  editing?: boolean;
  onMove?: (d: -1 | 1) => void;
  onSave: (p: Patch) => void;
  onDelete?: () => void;
  onCancel?: () => void;
}) {
  const [editing, setEditing] = useState(!!initialEditing);
  const [label, setLabel] = useState(status.label);
  const [color, setColor] = useState(status.color);
  const [kind, setKind] = useState<StatusKind>(status.kind);
  const [onRoadmap, setOnRoadmap] = useState(status.onRoadmap);

  if (editing) {
    return (
      <form
        className="flex flex-col gap-3 border-t py-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ label, color, kind, onRoadmap });
          if (!initialEditing) setEditing(false);
        }}
      >
        <div className="flex items-center gap-2">
          <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder={m.settings_statuses_label_placeholder()} className="h-8 w-48 rounded-lg border border-input bg-card px-2.5 text-[13px] outline-none placeholder:text-faint focus:border-ring/60" />
          <span className="flex gap-1.5">
            {SWATCHES.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} className={cn("inline-flex size-[22px] items-center justify-center rounded-full", color === c && "ring-2 ring-foreground ring-offset-2 ring-offset-background")} style={{ background: c }}>
                {color === c ? <CheckIcon weight="bold" className="size-2.5 text-[#0d0d0f]" /> : null}
              </button>
            ))}
          </span>
          <input value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-24 rounded-lg border border-input bg-card px-2.5 text-[12px] tabular-nums outline-none focus:border-ring/60" />
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 items-center gap-2 rounded-lg border border-input bg-card pr-2 pl-2.5 text-[13px] outline-none hover:bg-accent">
              <span className="text-faint">{m.settings_statuses_kind()}</span> {KIND_NAME[kind]()} <CaretDownIcon className="size-2.5 text-faint" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-72">
              {STATUS_KINDS.map((k) => (
                <DropdownMenuItem key={k} onClick={() => setKind(k)}>
                  <span className="min-w-24 shrink-0 font-semibold">{KIND_NAME[k]()}</span>
                  <span className="text-xs text-muted-foreground">{KIND_HELP[k]()}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <label className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
            <Toggle on={onRoadmap} onChange={setOnRoadmap} label={m.settings_statuses_on_roadmap()} /> {m.settings_statuses_on_roadmap()}
          </label>
          <span className="flex-1" />
          <Button size="sm" variant="ghost" type="button" onClick={() => (onCancel ? onCancel() : setEditing(false))}>
            {m.settings_cancel()}
          </Button>
          <Button size="sm" type="submit" disabled={!label.trim()}>
            {m.settings_save()}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 border-t py-2.5">
      <span className="flex flex-col">
        <button type="button" disabled={first} onClick={() => onMove?.(-1)} className="text-faint hover:text-foreground disabled:opacity-30">
          <CaretUpIcon className="size-3" />
        </button>
        <button type="button" disabled={last} onClick={() => onMove?.(1)} className="text-faint hover:text-foreground disabled:opacity-30">
          <CaretDownIcon className="size-3" />
        </button>
      </span>
      <span className="size-2.5 rounded-full" style={{ background: status.color }} />
      <span className="w-40 text-[13px] font-semibold">{status.label}</span>
      <span className="text-[11px] text-faint">{KIND_NAME[status.kind]()}</span>
      {status.onRoadmap ? <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-faint">{m.settings_statuses_roadmap_chip()}</span> : null}
      <span className="flex-1" />
      <span className="text-xs text-faint tabular-nums">
        {m.settings_posts_count({ count })}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex size-[26px] items-center justify-center rounded-md text-faint outline-none hover:bg-accent hover:text-foreground">
          <DotsThreeIcon weight="bold" className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-32">
          <DropdownMenuItem onClick={() => setEditing(true)}>{m.settings_edit()}</DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            {m.settings_delete()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
