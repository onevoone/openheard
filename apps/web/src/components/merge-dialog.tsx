import { m } from "@openheard/i18n/messages";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@openheard/ui/components/dialog";
import { Input } from "@openheard/ui/components/input";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { mergePosts, searchPosts } from "@/functions/posts";
import { findStatus, useStatuses } from "@/lib/status";

export function MergeDialog({ open, onOpenChange, postId, onMerged }: { open: boolean; onOpenChange: (o: boolean) => void; postId: number; onMerged: (into: number) => void }) {
  const statuses = useStatuses();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: number; title: string; voteCount: number; status: string }[]>([]);
  useEffect(() => {
    if (!q.trim()) return setResults([]);
    const t = setTimeout(() => searchPosts({ data: { q } }).then((r) => setResults(r.filter((p) => p.id !== postId))), 150);
    return () => clearTimeout(t);
  }, [q, postId]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.merge_title()}</DialogTitle>
          <DialogDescription>{m.merge_description()}</DialogDescription>
        </DialogHeader>
        <Input autoFocus placeholder={m.merge_search()} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex flex-col overflow-hidden rounded-md border">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">{q ? m.common_no_matches() : m.merge_type_to_search()}</div>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => mergePosts({ data: { from: postId, into: r.id } }).then(() => onMerged(r.id)).catch((e) => toast.error(e.message))}
                className="flex items-center gap-3 border-b px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-accent"
              >
                <span className="size-[7px] shrink-0 rounded-full" style={{ background: findStatus(statuses, r.status).color }} />
                <span className="flex-1 truncate">{r.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{r.voteCount}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
