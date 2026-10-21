import { m } from "@openheard/i18n/messages";
import { Button } from "@openheard/ui/components/button";
import { cn } from "@openheard/ui/lib/utils";
import { CopyIcon } from "@phosphor-icons/react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SectionHead } from "@/components/admin/panel";
import { deleteIntegration, listIntegrations, saveIntegration, testIntegration } from "@/functions/integrations";
import { EVENT_KEYS, type IntegrationEvent, type IntegrationKind, SIGNATURE_HEADER, checkIntegrationUrl } from "@/lib/integrations";
import { since } from "@/lib/time";
import { PageHead } from "@/routes/dashboard/settings";

export const Route = createFileRoute("/dashboard/settings/integrations")({
  loader: () => listIntegrations(),
  head: () => ({ meta: [{ title: m.settings_int_meta() }] }),
  component: Integrations,
});

type Data = Awaited<ReturnType<typeof listIntegrations>>;
type Saved = Data["integrations"][number];

// Titles and help are callbacks so they are worded while rendering. The
// placeholders are example URLs, the same in every language.
const COPY: Record<IntegrationKind, { title: () => string; help: () => string; placeholder: string }> = {
  slack: { title: () => "Slack", help: () => m.settings_int_slack_help(), placeholder: "https://hooks.slack.com/services/…" },
  discord: { title: () => "Discord", help: () => m.settings_int_discord_help(), placeholder: "https://discord.com/api/webhooks/…" },
  webhook: { title: () => m.settings_int_webhook_title(), help: () => m.settings_int_webhook_help(), placeholder: "https://example.com/hooks/openheard" },
};

const EVENT_LABEL: Record<IntegrationEvent, () => string> = {
  "post.created": () => m.settings_int_event_post_created(),
  "comment.created": () => m.settings_int_event_comment_created(),
  "post.status_changed": () => m.settings_int_event_status_changed(),
  "changelog.published": () => m.settings_int_event_changelog_published(),
};

function Integrations() {
  const { integrations, boards } = Route.useLoaderData();
  return (
    <>
      <PageHead title={m.settings_int_title()} sub={m.settings_int_sub()} />
      {(["slack", "discord", "webhook"] as const).map((kind) => (
        <Destination key={kind} kind={kind} saved={integrations.find((i) => i.kind === kind) ?? null} boards={boards} />
      ))}
    </>
  );
}

function Destination({ kind, saved, boards }: { kind: IntegrationKind; saved: Saved | null; boards: Data["boards"] }) {
  const router = useRouter();
  const copy = COPY[kind];
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<IntegrationEvent[]>((saved?.events as IntegrationEvent[]) ?? ["post.created", "post.status_changed"]);
  // Picks of since-deleted boards drop out, so saving is never stuck on them.
  const [boardIds, setBoardIds] = useState<string[]>(() => (saved?.boardIds ?? []).filter((id) => boards.some((b) => b.id === id)));
  const [enabled, setEnabled] = useState(saved?.enabled ?? true);
  const [busy, setBusy] = useState<"save" | "test" | "remove" | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const check = url ? checkIntegrationUrl(kind, url, { allowLocal: typeof window !== "undefined" && window.location.hostname.endsWith("localhost") }) : null;
  const urlError = check && !check.ok ? check.error : null;
  const dirty =
    !!url ||
    !saved ||
    JSON.stringify([...events].sort()) !== JSON.stringify([...saved.events].sort()) ||
    JSON.stringify([...boardIds].sort()) !== JSON.stringify([...(saved.boardIds ?? [])].sort()) ||
    enabled !== saved.enabled;

  const toggleEvent = (e: IntegrationEvent) => setEvents((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : EVENT_KEYS.filter((k) => k === e || cur.includes(k))));
  const toggleBoard = (id: string) => setBoardIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  async function run(kindOfWork: "save" | "test" | "remove", work: () => Promise<void>) {
    setBusy(kindOfWork);
    try {
      await work();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : m.settings_something_wrong());
    } finally {
      setBusy(null);
    }
  }

  const save = () =>
    run("save", async () => {
      const res = await saveIntegration({ data: { kind, url, events, boardIds: boardIds.length ? boardIds : null, enabled } });
      if (res.secret) setSecret(res.secret);
      setUrl("");
      toast.success(m.settings_int_saved({ title: copy.title() }));
      await router.invalidate();
    });

  const test = () =>
    run("test", async () => {
      const res = await testIntegration({ data: { kind, url } });
      if (res.ok) toast.success(m.settings_int_test_ok());
      else toast.error(m.settings_int_test_failed({ error: res.error }));
      await router.invalidate();
    });

  const remove = () =>
    confirm(m.settings_int_disconnect_confirm({ title: copy.title() })) &&
    run("remove", async () => {
      await deleteIntegration({ data: { kind } });
      setSecret(null);
      setUrl("");
      await router.invalidate();
    });

  return (
    <section className="pb-9" aria-labelledby={`int-${kind}`}>
      <SectionHead title={copy.title()} right={<DeliveryStatus saved={saved} />} />
      <div className="flex flex-col gap-4 border-t pt-4">
        <p id={`int-${kind}`} className="text-[13px] text-muted-foreground">
          {copy.help()}
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">{m.settings_int_url_label()}</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={saved ? m.settings_int_url_saved({ hint: saved.urlHint }) : copy.placeholder}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={!!urlError}
            className={cn("h-8 rounded-lg border border-input bg-card px-2.5 text-[13px] outline-none placeholder:text-[13px] placeholder:text-faint focus:border-ring/60", urlError && "border-destructive/60")}
          />
          {urlError ? <span className="text-xs text-destructive">{urlError}</span> : null}
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="pb-1.5 text-xs font-semibold text-muted-foreground">{m.settings_int_send_when()}</legend>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_KEYS.map((key) => (
              <Chip key={key} on={events.includes(key)} onClick={() => toggleEvent(key)}>
                {EVENT_LABEL[key]()}
              </Chip>
            ))}
          </div>
        </fieldset>

        {boards.length > 1 ? (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="pb-1.5 text-xs font-semibold text-muted-foreground">{m.settings_boards()}</legend>
            <div className="flex flex-wrap gap-1.5">
              <Chip on={boardIds.length === 0} onClick={() => setBoardIds([])}>
                {m.settings_int_all_boards()}
              </Chip>
              {boards.map((b) => (
                <Chip key={b.id} on={boardIds.includes(b.id)} onClick={() => toggleBoard(b.id)}>
                  {b.name}
                </Chip>
              ))}
            </div>
            <span className="text-xs text-faint">{m.settings_int_boards_note()}</span>
          </fieldset>
        ) : null}

        {kind === "webhook" && secret ? (
          <div className="flex flex-col gap-2 rounded-lg border border-status-shipped/30 bg-status-shipped/10 px-4 py-3">
            <div className="text-[13px] font-semibold">{m.settings_int_secret_title()}</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-background px-2.5 py-1.5 font-mono text-[12px]">{secret}</code>
              <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(secret).then(() => toast.success(m.settings_copied()))}>
                <CopyIcon className="size-3" /> {m.settings_copy()}
              </Button>
            </div>
          </div>
        ) : null}
        {kind === "webhook" && saved?.signed ? (
          <p className="text-xs text-faint">
            {m.settings_int_signed_before()} <code className="font-mono text-[11px] text-muted-foreground">{SIGNATURE_HEADER}: t=…,v1=…</code>
            {m.settings_int_signed_middle()} <code className="font-mono text-[11px] text-muted-foreground">t.body</code> {m.settings_int_signed_after()}
          </p>
        ) : null}

        <div className="flex items-center gap-2 pt-1">
          {saved ? (
            <label className="mr-auto flex items-center gap-2 text-[13px] text-muted-foreground">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-3.5 accent-[var(--link)]" />
              {m.settings_int_sending_on()}
            </label>
          ) : (
            <span className="mr-auto" />
          )}
          {saved ? (
            <Button size="sm" variant="ghost" onClick={remove} disabled={busy !== null}>
              {m.settings_int_disconnect()}
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" onClick={test} disabled={busy !== null || !!urlError || (!url && !saved)}>
            {busy === "test" ? m.settings_sending() : m.settings_int_send_test()}
          </Button>
          <Button size="sm" arrow onClick={save} disabled={busy !== null || !!urlError || (!saved && !url) || !dirty || events.length === 0}>
            {busy === "save" ? m.settings_saving() : m.settings_save()}
          </Button>
        </div>
      </div>
    </section>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] transition-colors duration-150", on ? "border-input bg-secondary text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}
    >
      <span aria-hidden className={cn("size-[5px] rounded-full", on ? "bg-link" : "bg-faint/60")} />
      {children}
    </button>
  );
}

function DeliveryStatus({ saved }: { saved: Saved | null }) {
  if (!saved) return <span className="text-xs text-faint">{m.settings_int_not_connected()}</span>;
  if (!saved.enabled) return <span className="text-xs text-faint">{m.settings_int_paused()}</span>;
  if (!saved.lastStatus || !saved.lastAt) return <span className="text-xs text-faint">{m.settings_int_idle()}</span>;
  const ok = saved.lastStatus === "ok";
  return (
    <span className="flex max-w-[60%] items-center gap-1.5 text-xs text-faint" title={saved.lastError ?? undefined}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", ok ? "bg-status-shipped" : "bg-destructive")} />
      <span className="truncate tabular-nums">{ok ? m.settings_int_delivered({ when: since(saved.lastAt) }) : m.settings_int_failed({ when: since(saved.lastAt), error: saved.lastError ?? m.settings_int_unknown_error() })}</span>
    </span>
  );
}
