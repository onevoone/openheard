import { m } from "@openheard/i18n/messages";
import { ThumbsDownIcon, ThumbsUpIcon } from "@phosphor-icons/react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/bits";
import { HelpLabel, Markdown } from "@/components/help/bits";
import { CollectionNav, HelpLayout, MobileNav, StillStuck, Toc } from "@/components/help/layout";
import { ErrorState, HelpArticleSkeleton } from "@/components/states";
import { getHelpArticle, voteHelpArticle } from "@/functions/help";
import { parseMarkdown, readingMinutes, tableOfContents } from "@/lib/help";
import { longDate } from "@/lib/time";
import { cn } from "@openheard/ui/lib/utils";

export const Route = createFileRoute("/help/$slug")({
  loader: async ({ params }) => {
    const data = await getHelpArticle({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { title, excerpt } = loaderData.article;
    return {
      meta: [
        { title },
        { name: "description", content: excerpt },
        { property: "og:title", content: title },
        { property: "og:description", content: excerpt },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
        ...(loaderData.article.status === "draft" ? [{ name: "robots", content: "noindex" }] : []),
      ],
    };
  },
  component: ArticlePage,
  errorComponent: ({ error }) => <ErrorState message={(error as Error)?.message} retry="/help" />,
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-8 py-24 text-center">
      <h1 className="text-xl font-semibold">{m.help_article_missing_title()}</h1>
      <p className="mt-2 text-muted-foreground">
        {m.help_article_missing_text()}{" "}
        <Link to="/help" className="text-link hover:underline">
          {m.help_article_missing_link()}
        </Link>
      </p>
    </main>
  ),
  pendingComponent: HelpArticleSkeleton,
});

function ArticlePage() {
  const { article, nav } = Route.useLoaderData();
  const blocks = useMemo(() => parseMarkdown(article.body), [article.body]);
  const toc = useMemo(() => tableOfContents(blocks), [blocks]);
  const collection = article.collection;

  return (
    <HelpLayout
      nav={<CollectionNav nav={nav} collection={collection?.slug ?? null} article={article.slug} />}
      mobileNav={nav.length ? <MobileNav nav={nav} value={`a:${article.slug}`} current={article.title} /> : null}
      rail={
        <>
          <Toc items={toc} />
          <StillStuck />
        </>
      }
    >
      <article className="flex flex-col">
        <nav aria-label={m.help_breadcrumb()} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-faint">
          <Link to="/help" className="hover:text-muted-foreground">
            {m.nav_help()}
          </Link>
          <span aria-hidden>/</span>
          {collection ? (
            <>
              <Link to="/help/collections/$slug" params={{ slug: collection.slug }} className="hover:text-muted-foreground">
                {collection.title}
              </Link>
              <span aria-hidden>/</span>
            </>
          ) : null}
          <span className="truncate text-muted-foreground" aria-current="page">
            {article.title}
          </span>
        </nav>

        {article.status === "draft" ? (
          <p className="mt-5 self-start rounded-md border border-dashed border-input px-2 py-0.5 text-[12px] text-faint">{m.help_draft_notice()}</p>
        ) : null}

        <h1 className="mt-4 text-[28px] leading-[1.2] font-semibold tracking-[-0.025em] md:text-[32px]">{article.title}</h1>
        {article.excerpt ? <p className="mt-3 text-[18px] leading-[1.55] text-muted-foreground">{article.excerpt}</p> : null}
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-b pb-7">
          {article.author ? (
            <span className="inline-flex items-center gap-2 text-[14px] text-foreground/90">
              <Avatar name={article.author.name} image={article.author.image} size={22} />
              {article.author.name}
            </span>
          ) : null}
          <span className="text-[12px] text-faint tabular-nums">{m.help_updated({ date: longDate(article.updatedAt) })}</span>
          <span className="text-[12px] text-faint tabular-nums">{m.help_read_minutes({ minutes: readingMinutes(article.body) })}</span>
        </div>

        {blocks.length ? <Markdown blocks={blocks} className="mt-8" /> : <p className="mt-8 text-muted-foreground">{m.help_article_empty()}</p>}

        {article.status === "published" ? <Helpful articleId={article.id} /> : null}

        {article.related.length ? (
          <section className="mt-10">
            <HelpLabel className="pb-2">{m.help_related()}</HelpLabel>
            <ul className="flex flex-col">
              {article.related.map((r) => (
                <li key={r.slug}>
                  <Link to="/help/$slug" params={{ slug: r.slug }} className="group/r flex h-12 items-center justify-between gap-4 border-b text-[15px] text-foreground/90 hover:text-foreground">
                    <span className="truncate">{r.title}</span>
                    {r.collection ? <span className="shrink-0 text-[12px] text-faint group-hover/r:text-muted-foreground">{r.collection}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </HelpLayout>
  );
}

const ANSWERS_KEY = "oh_help_answers";

function readAnswers(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(ANSWERS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

// One answer per reader. The server dedupes; this remembers the answer so the
// buttons show it on the next visit.
function Helpful({ articleId }: { articleId: number }) {
  const [answer, setAnswer] = useState<boolean | null>(null);
  useEffect(() => {
    setAnswer(readAnswers()[articleId] ?? null);
  }, [articleId]);

  function vote(helpful: boolean) {
    if (answer === helpful) return;
    const before = answer;
    setAnswer(helpful);
    localStorage.setItem(ANSWERS_KEY, JSON.stringify({ ...readAnswers(), [articleId]: helpful }));
    voteHelpArticle({ data: { articleId, helpful } }).catch((err) => {
      setAnswer(before);
      const answers = readAnswers();
      if (before === null) delete answers[articleId];
      else answers[articleId] = before;
      localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers));
      toast.error(err instanceof Error ? err.message : m.help_helpful_failed());
    });
  }

  const btn = (on: boolean) =>
    cn(
      "inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-[14px] font-semibold transition-colors duration-150 active:scale-[0.97] motion-reduce:transition-none",
      on ? "border-link/60 bg-link/10 text-link" : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
    );

  return (
    <section className="mt-12 flex flex-wrap items-center justify-between gap-4 border-y py-5" aria-label={m.help_helpful_question()}>
      <p className="text-[15px] font-semibold" aria-live="polite">
        {answer === null ? m.help_helpful_question() : answer ? m.help_helpful_yes_reply() : m.help_helpful_no_reply()}
      </p>
      <div className="flex gap-2">
        <button type="button" aria-pressed={answer === true} onClick={() => vote(true)} className={btn(answer === true)}>
          <ThumbsUpIcon weight={answer === true ? "fill" : "regular"} className="size-4" /> {m.help_helpful_yes()}
        </button>
        <button type="button" aria-pressed={answer === false} onClick={() => vote(false)} className={btn(answer === false)}>
          <ThumbsDownIcon weight={answer === false ? "fill" : "regular"} className="size-4" /> {m.help_helpful_no()}
        </button>
      </div>
    </section>
  );
}
