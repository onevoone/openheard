import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { m } from "@openheard/i18n/messages";
import { Button } from "@openheard/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@openheard/ui/components/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@openheard/ui/components/dropdown-menu";
import { Input } from "@openheard/ui/components/input";
import { ArrowLeftIcon, ArrowSquareOutIcon, CaretDownIcon, CheckCircleIcon, CircleDashedIcon, DotsSixVerticalIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { dndAccessibility } from "@/components/admin/dnd";
import { Panel } from "@/components/admin/panel";
import { HelpIcon, Markdown } from "@/components/help/bits";
import { DashboardErrorState, DashboardPanelSkeleton } from "@/components/states";
import { deleteHelpArticle, deleteHelpCollection, listHelpAdmin, reorderHelpCollections, saveHelpArticle, saveHelpCollection } from "@/functions/help";
import { HELP_ICONS, HELP_SLUG, parseMarkdown, slugify, type HelpIcon as HelpIconName } from "@/lib/help";
import { ago, fullDate } from "@/lib/time";
import { cn } from "@openheard/ui/lib/utils";

type Data = Awaited<ReturnType<typeof listHelpAdmin>>;
type Article = Data["articles"][number];
type Collection = Data["collections"][number];
type Search = { article?: number | "new"; collection?: number };

export const Route = createFileRoute("/dashboard/help")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    article: s.article === "new" ? "new" : typeof s.article === "number" ? s.article : typeof s.article === "string" && /^\d+$/.test(s.article) ? Number(s.article) : undefined,
    // Preselects the collection for a new article.
    collection: typeof s.collection === "number" ? s.collection : typeof s.collection === "string" && /^\d+$/.test(s.collection) ? Number(s.collection) : undefined,
  }),
  loaderDeps: () => ({}),
  loader: () => listHelpAdmin(),
  head: () => ({ meta: [{ title: `${m.dash_nav_help()} · openheard` }] }),
  component: HelpPage,
  errorComponent: ({ error }) => <DashboardErrorState message={(error as Error)?.message} retry="/dashboard/help" />,
  pendingComponent: DashboardPanelSkeleton,
});

// Collections as groups of article rows, and the same document editor the
// changelog uses when you open an article.
function HelpPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard/help" });
  const [editingCollection, setEditingCollection] = useState<Collection | "new" | null>(null);
  const open = search.article === "new" ? "new" : data.articles.find((a) => a.id === search.article);

  if (open) {
    return (
      <Editor
        key={open === "new" ? "new" : open.id}
        article={open === "new" ? null : open}
        collections={data.collections}
        defaultCollection={search.collection ?? null}
        onClose={() => navigate({ search: {} })}
      />
    );
  }

  const published = data.articles.filter((a) => a.status === "published").length;

  return (
    <Panel
      title={m.dash_nav_help()}
      actions={
        <>
          {published ? (
            <a href="/help" target="_blank" rel="noreferrer" className="hidden h-[30px] items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground sm:inline-flex">
              <ArrowSquareOutIcon className="size-3.5" /> {m.dash_view()}
            </a>
          ) : null}
          <Button size="sm" variant="secondary" onClick={() => setEditingCollection("new")}>
            {m.dash_help_collection_new()}
          </Button>
          <Button size="sm" arrow onClick={() => navigate({ search: { article: "new" } })}>
            {m.dash_help_new_article()}
          </Button>
        </>
      }
    >
      {data.articles.length === 0 && data.collections.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
          <p className="text-[15px] font-semibold">{m.dash_help_no_articles()}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{m.dash_help_empty_text()}</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditingCollection("new")}>
              {m.dash_help_collection_new()}
            </Button>
            <Button size="sm" arrow onClick={() => navigate({ search: { article: "new" } })}>
              {m.dash_help_new_article()}
            </Button>
          </div>
        </div>
      ) : (
        <Groups data={data} onEditCollection={setEditingCollection} />
      )}
      <CollectionDialog collection={editingCollection} onClose={() => setEditingCollection(null)} />
    </Panel>
  );
}

function Groups({ data, onEditCollection }: { data: Data; onEditCollection: (c: Collection) => void }) {
  const router = useRouter();
  const [order, setOrder] = useState(() => data.collections.map((c) => c.id));
  // Follow the server when collections are added or removed.
  const [prev, setPrev] = useState(data.collections);
  if (prev !== data.collections) {
    setPrev(data.collections);
    setOrder(data.collections.map((c) => c.id));
  }
  // Space on a focused collection header picks it up; arrows move it.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [liveRegion, setLiveRegion] = useState<HTMLElement | null>(null);
  const byId = new Map(data.collections.map((c) => [c.id, c]));
  const loose = data.articles.filter((a) => a.collectionId === null || !byId.has(a.collectionId));

  async function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(order, order.indexOf(e.active.id as number), order.indexOf(e.over.id as number));
    const before = order;
    setOrder(next);
    try {
      await reorderHelpCollections({ data: { ids: next } });
      await router.invalidate();
    } catch (err) {
      setOrder(before);
      toast.error(err instanceof Error ? err.message : m.dash_help_reorder_failed());
    }
  }

  return (
    <div className="flex flex-col pb-10">
      <div ref={setLiveRegion} className="sr-only" />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={{ ...dndAccessibility(), container: liveRegion ?? undefined }}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((id) => {
            const c = byId.get(id);
            return c ? <CollectionGroup key={id} collection={c} articles={data.articles.filter((a) => a.collectionId === id)} onEdit={() => onEditCollection(c)} /> : null;
          })}
        </SortableContext>
      </DndContext>
      {loose.length ? (
        <section>
          <div className="flex h-11 shrink-0 items-center gap-3 border-b bg-card/40 px-5">
            <span className="w-4" />
            <span className="text-[13px] font-semibold text-muted-foreground">{m.dash_help_loose()}</span>
            <span className="text-[12px] text-faint tabular-nums">{loose.length}</span>
          </div>
          {loose.map((a) => (
            <ArticleRow key={a.id} article={a} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function CollectionGroup({ collection, articles, onEdit }: { collection: Collection; articles: Article[]; onEdit: () => void }) {
  const navigate = useNavigate({ from: "/dashboard/help" });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: collection.id });
  return (
    <section ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition: transition ?? undefined }} className={cn("bg-background", isDragging && "relative z-10 shadow-[0_12px_32px_rgba(0,0,0,.45)]")}>
      <div className="group/c flex h-11 shrink-0 cursor-grab items-center gap-3 border-b bg-card/40 pr-3 pl-2 active:cursor-grabbing" {...attributes} {...listeners} aria-label={m.dash_help_drag_aria({ title: collection.title })}>
        <DotsSixVerticalIcon className="size-4 shrink-0 text-faint opacity-40 group-hover/c:opacity-100" />
        <HelpIcon name={collection.icon} className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate text-[14px] font-semibold">{collection.title}</span>
        <span className="text-[12px] text-faint tabular-nums">{articles.length}</span>
        {collection.description ? <span className="hidden min-w-0 truncate text-[12px] text-faint lg:inline">{collection.description}</span> : null}
        <span className="flex-1" />
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} onClick={() => navigate({ search: { article: "new", collection: collection.id } })} className="inline-flex size-7 items-center justify-center rounded-md text-faint hover:bg-accent hover:text-foreground" title={m.dash_help_new_in_collection()}>
          <PlusIcon className="size-3.5" />
        </button>
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} onClick={onEdit} className="inline-flex size-7 items-center justify-center rounded-md text-faint hover:bg-accent hover:text-foreground" title={m.dash_help_collection_edit()}>
          <PencilSimpleIcon className="size-3.5" />
        </button>
      </div>
      {articles.length ? articles.map((a) => <ArticleRow key={a.id} article={a} />) : <div className="flex h-11 items-center border-b pl-14 text-[13px] text-faint">{m.dash_help_no_articles()}</div>}
    </section>
  );
}

function ArticleRow({ article: a }: { article: Article }) {
  const navigate = useNavigate({ from: "/dashboard/help" });
  const votes = a.helpfulCount + a.unhelpfulCount;
  return (
    <button type="button" onClick={() => navigate({ search: { article: a.id } })} className="flex h-12 w-full shrink-0 items-center gap-3.5 border-b pr-5 pl-9 text-left hover:bg-card/60">
      {a.status === "published" ? <CheckCircleIcon weight="fill" className="size-[18px] shrink-0 text-status-shipped" /> : <CircleDashedIcon className="size-[18px] shrink-0 text-status-planned" />}
      <span className="min-w-0 truncate text-[15px] font-medium">{a.title}</span>
      {a.status === "draft" ? <span className="shrink-0 rounded-md bg-status-planned/15 px-2 py-0.5 text-[12px] font-medium text-status-planned">{m.dash_draft()}</span> : null}
      <span className="hidden shrink-0 text-[12px] text-faint md:inline">/help/{a.slug}</span>
      <span className="flex-1" />
      {votes ? (
        <span className="shrink-0 text-[12px] text-faint tabular-nums" title={m.dash_help_helpful_title({ helpful: a.helpfulCount, unhelpful: a.unhelpfulCount })}>
          {m.dash_help_helpful_percent({ percent: Math.round((a.helpfulCount / votes) * 100) })}
        </span>
      ) : null}
      <span className="w-10 shrink-0 text-right text-[12px] text-faint tabular-nums" title={fullDate(a.updatedAt)}>
        {ago(a.updatedAt)}
      </span>
    </button>
  );
}

function Editor({ article, collections, defaultCollection, onClose }: { article: Article | null; collections: Collection[]; defaultCollection: number | null; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(article?.title ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [body, setBody] = useState(article?.body ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [collectionId, setCollectionId] = useState<number | null>(article ? article.collectionId : (defaultCollection ?? collections[0]?.id ?? null));
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const published = article?.status === "published";
  const collection = collections.find((c) => c.id === collectionId) ?? null;
  const shownSlug = slug || slugify(title) || "article";
  const slugOk = !slug || HELP_SLUG.test(slug);
  const blocks = useMemo(() => (preview ? parseMarkdown(body) : []), [preview, body]);
  const dirty =
    title !== (article?.title ?? "") || excerpt !== (article?.excerpt ?? "") || body !== (article?.body ?? "") || slug !== (article?.slug ?? "") || collectionId !== (article ? article.collectionId : (defaultCollection ?? collections[0]?.id ?? null));

  async function save(publish: boolean) {
    if (title.trim().length < 3) return toast(m.dash_need_title());
    if (!slugOk) return toast(m.dash_help_address_invalid());
    setBusy(true);
    try {
      const { id, slug: saved } = await saveHelpArticle({ data: { id: article?.id, title, excerpt, body, slug, collectionId, publish } });
      setSlug(saved);
      await router.invalidate();
      toast.success(publish ? (published ? m.dash_saved() : m.dash_help_published_at({ slug: saved })) : published ? m.dash_unpublished() : m.dash_draft_saved());
      if (!article && id) router.navigate({ to: "/dashboard/help", search: { article: id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : m.dash_save_failed());
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!article || !confirm(m.dash_confirm_delete({ title: article.title }))) return;
    await deleteHelpArticle({ data: { id: article.id } });
    await router.invalidate();
    onClose();
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col py-3 pr-3">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background animate-in fade-in-0 duration-150 motion-reduce:animate-none">
        <div className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b pr-3 pl-3">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={onClose} className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" title={m.dash_back()}>
              <ArrowLeftIcon className="size-4" />
            </button>
            <span className="truncate text-[15px] font-semibold">{article ? article.title : m.dash_help_new_article()}</span>
            <span className={cn("ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium", published ? "bg-status-shipped/15 text-status-shipped" : "bg-status-planned/15 text-status-planned")}>
              {published ? m.dash_published() : m.dash_draft()}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="mr-1 hidden h-[30px] items-center rounded-lg border border-input bg-card p-0.5 sm:flex" role="tablist" aria-label={m.dash_help_editor_mode_aria()}>
              {([false, true] as const).map((on) => (
                <button
                  key={String(on)}
                  type="button"
                  role="tab"
                  aria-selected={preview === on}
                  onClick={() => setPreview(on)}
                  className={cn("h-full rounded-md px-2.5 text-xs font-semibold", preview === on ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {on ? m.dash_help_mode_preview() : m.dash_help_mode_write()}
                </button>
              ))}
            </div>
            {article ? (
              <Button size="sm" variant="ghost" onClick={remove} title={m.dash_delete()}>
                <TrashIcon className="size-3.5" />
              </Button>
            ) : null}
            {article ? (
              <a href={`/help/${article.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-[30px] items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                <ArrowSquareOutIcon className="size-3.5" /> {m.dash_view()}
              </a>
            ) : null}
            {published ? (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => save(false)}>
                {m.dash_unpublish()}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" disabled={busy || (!!article && !dirty)} onClick={() => save(false)}>
                {m.dash_save_draft()}
              </Button>
            )}
            <Button size="sm" arrow disabled={busy || (published && !dirty)} onClick={() => save(true)}>
              {published ? m.dash_save() : m.dash_publish()}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-6 py-10">
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-secondary pr-2 pl-2.5 text-[12px] text-foreground outline-none hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring">
                  <HelpIcon name={collection?.icon ?? "book"} className="size-3.5 text-muted-foreground" />
                  {collection?.title ?? m.dash_help_no_collection()}
                  <CaretDownIcon className="size-2.5 text-faint" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-48">
                  {collections.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => setCollectionId(c.id)}>
                      <HelpIcon name={c.icon} className="size-3.5" /> {c.title}
                    </DropdownMenuItem>
                  ))}
                  {collections.length ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem onClick={() => setCollectionId(null)}>{m.dash_help_no_collection()}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <label className={cn("flex h-7 items-center rounded-md border border-transparent pl-2 text-[12px] text-faint focus-within:border-ring/60 hover:border-input", !slugOk && "border-destructive/60")}>
                /help/
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  placeholder={shownSlug}
                  aria-label={m.dash_help_address_aria()}
                  size={Math.max(8, (slug || shownSlug).length)}
                  className="h-full bg-transparent pr-2 text-muted-foreground outline-none placeholder:text-faint"
                />
              </label>
            </div>
            <input
              autoFocus={!article}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  bodyRef.current?.focus();
                }
              }}
              placeholder={m.dash_help_article_title()}
              aria-label={m.dash_help_article_title()}
              className="w-full bg-transparent text-[32px] font-semibold tracking-[-0.02em] outline-none placeholder:text-faint"
            />
            <input
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              maxLength={240}
              placeholder={m.dash_help_excerpt_placeholder()}
              aria-label={m.dash_help_excerpt_aria()}
              className="w-full bg-transparent text-[17px] text-muted-foreground outline-none placeholder:text-faint"
            />
            <div className="border-t pt-6">
              {preview ? (
                blocks.length ? (
                  <Markdown blocks={blocks} className="min-h-[320px]" />
                ) : (
                  <p className="min-h-[320px] text-faint">{m.dash_help_preview_empty()}</p>
                )
              ) : (
                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      save(true);
                    }
                  }}
                  placeholder={m.dash_help_body_placeholder()}
                  aria-label={m.dash_help_body_aria()}
                  className="min-h-[360px] w-full resize-none bg-transparent text-[14px] leading-[1.7] text-foreground/90 outline-none field-sizing-content placeholder:text-faint"
                />
              )}
            </div>
            <p className="text-[12px] text-faint">{m.dash_help_markdown_note()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionDialog({ collection, onClose }: { collection: Collection | "new" | null; onClose: () => void }) {
  const router = useRouter();
  const c = collection === "new" ? null : collection;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<HelpIconName>("book");
  const [busy, setBusy] = useState(false);
  const [openFor, setOpenFor] = useState<typeof collection>(null);
  // Reset the form each time the dialog opens for a different collection.
  if (openFor !== collection) {
    setOpenFor(collection);
    setTitle(c?.title ?? "");
    setDescription(c?.description ?? "");
    setIcon((c?.icon as HelpIconName) ?? "book");
  }

  async function save() {
    if (title.trim().length < 2) return toast(m.dash_help_collection_name_required());
    setBusy(true);
    try {
      await saveHelpCollection({ data: { id: c?.id, title, description, icon, slug: c?.slug ?? "" } });
      await router.invalidate();
      onClose();
      toast.success(c ? m.dash_help_collection_saved() : m.dash_help_collection_created());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : m.dash_save_failed());
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!c || !confirm(m.dash_help_confirm_delete_collection({ title: c.title }))) return;
    await deleteHelpCollection({ data: { id: c.id } });
    await router.invalidate();
    onClose();
  }

  return (
    <Dialog open={collection !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-xl border-input bg-card">
        <DialogHeader>
          <DialogTitle>{c ? m.dash_help_collection_edit() : m.dash_help_collection_new()}</DialogTitle>
          <DialogDescription>{m.dash_help_collection_dialog_text()}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={m.dash_help_collection_icon_aria()}>
            {HELP_ICONS.map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={icon === name}
                aria-label={name}
                onClick={() => setIcon(name)}
                className={cn("inline-flex size-8 items-center justify-center rounded-lg border", icon === name ? "border-link/60 bg-link/10 text-link" : "border-input text-muted-foreground hover:bg-accent hover:text-foreground")}
              >
                <HelpIcon name={name} className="size-4" />
              </button>
            ))}
          </div>
          <Input autoFocus placeholder={m.dash_help_collection_name_placeholder()} value={title} onChange={(e) => setTitle(e.target.value)} aria-label={m.dash_help_collection_name_aria()} className="h-10 text-[14px] font-semibold" />
          <Input placeholder={m.dash_help_collection_description_placeholder()} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} aria-label={m.dash_help_collection_description_aria()} />
          <div className="flex items-center justify-between gap-2 pt-1">
            {c ? (
              <Button type="button" variant="ghost" size="sm" onClick={remove}>
                <TrashIcon className="size-3.5" /> {m.dash_delete()}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                {m.dash_cancel()}
              </Button>
              <Button type="submit" arrow disabled={busy || title.trim().length < 2}>
                {c ? m.dash_save() : m.dash_create()}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
