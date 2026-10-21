import { m } from "@openheard/i18n/messages";
import { Button } from "@openheard/ui/components/button";
import { ArrowLeftIcon, ArrowSquareOutIcon, CheckCircleIcon, CircleDashedIcon, ImageIcon, PlusIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { createFileRoute, useLoaderData, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/admin/panel";
import { Avatar } from "@/components/bits";
import { DashboardErrorState, DashboardPanelSkeleton } from "@/components/states";
import { deleteChangelog, listChangelog, saveChangelog } from "@/functions/changelog";
import { searchPosts } from "@/functions/posts";
import { ago, fullDate, since } from "@/lib/time";
import { cn } from "@openheard/ui/lib/utils";

type Entry = Awaited<ReturnType<typeof listChangelog>>[number];
type Search = { entry?: number | "new" };

export const Route = createFileRoute("/dashboard/changelog")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    entry: s.entry === "new" ? "new" : typeof s.entry === "number" ? s.entry : typeof s.entry === "string" && /^\d+$/.test(s.entry) ? Number(s.entry) : undefined,
  }),
  loaderDeps: () => ({}),
  loader: () => listChangelog(),
  head: () => ({ meta: [{ title: `${m.nav_changelog()} · openheard` }] }),
  component: ChangelogPage,
  errorComponent: ({ error }) => <DashboardErrorState message={(error as Error)?.message} retry="/dashboard/changelog" />,
  pendingComponent: DashboardPanelSkeleton,
});

// A plain list, and a document-style editor when you open an entry.
function ChangelogPage() {
  const entries = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard/changelog" });
  const root = useLoaderData({ from: "__root__" });
  const open = search.entry === "new" ? "new" : entries.find((e) => e.id === search.entry);

  if (open) {
    return <Editor key={open === "new" ? "new" : open.id} entry={open === "new" ? null : open} onClose={() => navigate({ search: {} })} />;
  }

  return (
    <Panel
      title={m.nav_changelog()}
      actions={
        <Button size="sm" arrow onClick={() => navigate({ search: { entry: "new" } })}>
          {m.dash_changelog_new_entry()}
        </Button>
      }
    >
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
          <p className="text-[15px] font-semibold">{m.dash_changelog_empty_title()}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{m.dash_changelog_empty_text()}</p>
          <Button size="sm" arrow className="mt-2" onClick={() => navigate({ search: { entry: "new" } })}>
            {m.dash_changelog_new_entry()}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col">
          {entries.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => navigate({ search: { entry: e.id } })}
              className="flex h-13 shrink-0 items-center gap-3.5 border-b px-5 text-left hover:bg-card/60"
            >
              {e.publishedAt ? <CheckCircleIcon weight="fill" className="size-5 shrink-0 text-status-shipped" /> : <CircleDashedIcon className="size-5 shrink-0 text-status-planned" />}
              <span className="min-w-0 truncate text-[16px] font-medium">{e.title}</span>
              {e.version ? <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 text-[12px] text-muted-foreground tabular-nums">{e.version}</span> : null}
              {!e.publishedAt ? <span className="shrink-0 rounded-md bg-status-planned/15 px-2 py-0.5 text-[12px] font-medium text-status-planned">{m.dash_draft()}</span> : null}
              {e.posts.length ? (
                <span className="shrink-0 text-[12px] text-faint">
                  {m.dash_changelog_posts_count({ count: e.posts.length })}
                </span>
              ) : null}
              <span className="flex-1" />
              <span className="text-[12px] whitespace-nowrap text-faint tabular-nums" title={fullDate(e.publishedAt ?? e.createdAt)} suppressHydrationWarning>
                {ago(e.publishedAt ?? e.createdAt)}
              </span>
              <Avatar name={root.user?.name ?? "?"} image={root.user?.image} size={24} />
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Editor({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [version, setVersion] = useState(entry?.version ?? "");
  const [body, setBody] = useState(entry?.body ?? "");
  const [posts, setPosts] = useState<{ id: number; title: string }[]>(entry?.posts ?? []);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: number; title: string }[]>([]);
  const [linking, setLinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const published = !!entry?.publishedAt;
  const dirty = title !== (entry?.title ?? "") || version !== (entry?.version ?? "") || body !== (entry?.body ?? "") || posts.map((p) => p.id).join() !== (entry?.posts ?? []).map((p) => p.id).join();

  useEffect(() => {
    if (!q.trim()) return setResults([]);
    const t = setTimeout(() => searchPosts({ data: { q } }).then((r) => setResults(r.filter((x) => !posts.some((p) => p.id === x.id)))), 150);
    return () => clearTimeout(t);
  }, [q, posts]);

  async function save(publish: boolean) {
    if (title.trim().length < 3) return toast(m.dash_need_title());
    setBusy(true);
    try {
      const { id } = await saveChangelog({ data: { id: entry?.id, title, version, body, postIds: posts.map((p) => p.id), publish } });
      await router.invalidate();
      toast.success(publish ? (published ? m.dash_saved() : m.dash_changelog_published_toast()) : published ? m.dash_unpublished() : m.dash_draft_saved());
      if (!entry && id) router.navigate({ to: "/dashboard/changelog", search: { entry: id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : m.dash_save_failed());
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!entry || !confirm(m.dash_confirm_delete({ title: entry.title }))) return;
    await deleteChangelog({ data: { id: entry.id } });
    await router.invalidate();
    onClose();
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col py-3 pr-3">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background animate-in fade-in-0 duration-150 motion-reduce:animate-none">
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b pr-3 pl-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" title={m.dash_back()}>
              <ArrowLeftIcon className="size-4" />
            </button>
            <span className="text-[15px] font-semibold">{entry ? entry.title : m.dash_changelog_new_entry()}</span>
            <span className={cn("ml-1 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium", published ? "bg-status-shipped/15 text-status-shipped" : "bg-status-planned/15 text-status-planned")} suppressHydrationWarning>
              {published ? m.dash_changelog_published_since({ since: since(entry!.publishedAt!) }) : m.dash_draft()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {entry ? (
              <Button size="sm" variant="ghost" onClick={remove} title={m.dash_delete()}>
                <TrashIcon className="size-3.5" />
              </Button>
            ) : null}
            {published ? (
              <a href="/changelog" target="_blank" rel="noreferrer" className="inline-flex h-[30px] items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                <ArrowSquareOutIcon className="size-3.5" /> {m.dash_view()}
              </a>
            ) : null}
            {published ? (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => save(false)}>
                {m.dash_unpublish()}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" disabled={busy || !dirty} onClick={() => save(false)}>
                {m.dash_save_draft()}
              </Button>
            )}
            <Button size="sm" arrow disabled={busy || (published && !dirty)} onClick={() => save(true)}>
              {published ? m.dash_save() : m.dash_publish()}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-6 py-10">
            <div className="flex items-center gap-2">
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0"
                aria-label={m.dash_changelog_version_aria()}
                className="h-7 w-24 rounded-md border border-transparent bg-transparent px-2 text-[12px] text-muted-foreground tabular-nums outline-none placeholder:text-faint hover:border-input focus:border-ring/60"
              />
              <button type="button" onClick={() => toast(m.dash_changelog_cover_soon())} className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-faint hover:bg-accent hover:text-foreground">
                <ImageIcon className="size-3.5" /> {m.dash_changelog_add_cover()}
              </button>
            </div>
            <input
              autoFocus={!entry}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  bodyRef.current?.focus();
                }
              }}
              placeholder={m.dash_changelog_title_placeholder()}
              aria-label={m.dash_changelog_title_aria()}
              className="w-full bg-transparent text-[32px] font-semibold tracking-[-0.02em] outline-none placeholder:text-faint"
            />
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={m.dash_changelog_body_placeholder()}
              aria-label={m.dash_changelog_body_aria()}
              className="min-h-[280px] w-full resize-none bg-transparent text-[16px] leading-[1.65] text-foreground/90 outline-none placeholder:text-faint"
            />

            <div className="flex flex-col gap-3 border-t pt-6">
              <div className="text-xs font-medium text-muted-foreground">{m.dash_changelog_ships()}</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {posts.map((p) => (
                  <span key={p.id} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-input pr-1.5 pl-2.5 text-[13px] text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-status-shipped" />
                    {p.title}
                    <button type="button" onClick={() => setPosts((ps) => ps.filter((x) => x.id !== p.id))} className="inline-flex size-5 items-center justify-center rounded-full text-faint hover:bg-accent hover:text-foreground" title={m.dash_changelog_remove_post()}>
                      <XIcon className="size-2.5" />
                    </button>
                  </span>
                ))}
                {linking ? (
                  <div className="relative">
                    <input
                      autoFocus
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onBlur={() => setTimeout(() => setLinking(false), 150)}
                      onKeyDown={(e) => e.key === "Escape" && setLinking(false)}
                      placeholder={m.nav_search_posts()}
                      aria-label={m.dash_changelog_search_aria()}
                      className="h-7 w-56 rounded-full border border-input bg-card px-3 text-[13px] outline-none placeholder:text-faint focus:border-ring/60"
                    />
                    {results.length ? (
                      <div className="absolute top-8 left-0 z-10 flex w-80 flex-col overflow-hidden rounded-lg border bg-popover shadow-md animate-in fade-in-0 zoom-in-95 duration-100">
                        {results.slice(0, 6).map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setPosts((ps) => [...ps, r]);
                              setQ("");
                              setLinking(false);
                            }}
                            className="truncate px-3 py-2 text-left text-[13px] hover:bg-accent"
                          >
                            {r.title}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <button type="button" onClick={() => setLinking(true)} className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-input px-2.5 text-[13px] text-faint hover:border-foreground/40 hover:text-foreground">
                    <PlusIcon className="size-3" /> {m.dash_changelog_link_post()}
                  </button>
                )}
              </div>
              <p className="text-[12px] text-faint">{m.dash_changelog_publish_note()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
