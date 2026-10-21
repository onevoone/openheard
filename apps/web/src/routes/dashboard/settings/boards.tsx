import { m } from "@openheard/i18n/messages";
import { Button } from "@openheard/ui/components/button";
import { DotsThreeIcon, PlusIcon } from "@phosphor-icons/react";
import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SectionHead } from "@/components/admin/panel";
import { deleteBoard, deleteTag, saveBoard, saveTag } from "@/functions/settings";
import { PageHead } from "@/routes/dashboard/settings";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@openheard/ui/components/dropdown-menu";

export const Route = createFileRoute("/dashboard/settings/boards")({
  head: () => ({ meta: [{ title: m.settings_boards_meta() }] }),
  component: Boards,
});

const input = "h-8 rounded-lg border border-input bg-card px-2.5 text-[13px] outline-none placeholder:text-faint focus:border-ring/60";

function Boards() {
  const root = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const [newBoard, setNewBoard] = useState<{ name: string; description: string } | null>(null);
  const [newTag, setNewTag] = useState<string | null>(null);

  function fire<T>(fn: () => Promise<T>, ok?: string) {
    if (ok) toast.success(ok);
    fn()
      .then(() => router.invalidate())
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : m.settings_action_failed());
        router.invalidate();
      });
  }

  return (
    <>
      <PageHead title={m.settings_boards_title()} sub={m.settings_boards_sub()} />

      <SectionHead
        title={m.settings_boards()}
        right={
          <Button variant="secondary" size="sm" onClick={() => setNewBoard({ name: "", description: "" })}>
            <PlusIcon weight="bold" className="size-3" /> {m.settings_boards_new()}
          </Button>
        }
      />
      {root.boards.map((b) => (
        <BoardRow key={b.id} board={b} onSave={(name, description) => fire(() => saveBoard({ data: { id: b.id, name, description } }), m.settings_boards_updated())} onDelete={() => confirm(m.settings_boards_delete_confirm({ name: b.name })) && fire(() => deleteBoard({ data: { id: b.id } }), m.settings_boards_deleted())} />
      ))}
      {newBoard ? (
        <form
          className="flex items-center gap-2 border-t py-3"
          onSubmit={(e) => {
            e.preventDefault();
            fire(() => saveBoard({ data: newBoard }), m.settings_boards_added());
            setNewBoard(null);
          }}
        >
          <input autoFocus placeholder={m.settings_boards_name_placeholder()} value={newBoard.name} onChange={(e) => setNewBoard({ ...newBoard, name: e.target.value })} className={`${input} w-48`} />
          <input placeholder={m.settings_boards_description_placeholder()} value={newBoard.description} onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })} className={`${input} flex-1`} />
          <Button size="sm" type="submit" disabled={!newBoard.name.trim()}>
            {m.settings_add()}
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => setNewBoard(null)}>
            {m.settings_cancel()}
          </Button>
        </form>
      ) : null}

      <div className="pt-8">
        <SectionHead
          title={m.settings_tags_title()}
          right={
            <Button variant="secondary" size="sm" onClick={() => setNewTag("")}>
              <PlusIcon weight="bold" className="size-3" /> {m.settings_tags_new()}
            </Button>
          }
        />
      </div>
      {root.tags.length === 0 && newTag === null ? <p className="border-t py-4 text-sm text-faint">{m.settings_tags_empty()}</p> : null}
      {root.tags.map((t) => (
        <div key={t.id} className="flex items-center gap-3 border-t py-2.5">
          <span className="inline-flex h-[22px] items-center rounded-md border border-input bg-secondary px-2 text-xs">{t.name}</span>
          <span className="flex-1" />
          <More onDelete={() => fire(() => deleteTag({ data: { id: t.id } }), m.settings_tags_deleted())} />
        </div>
      ))}
      {newTag !== null ? (
        <form
          className="flex items-center gap-2 border-t py-3"
          onSubmit={(e) => {
            e.preventDefault();
            fire(() => saveTag({ data: { name: newTag } }), m.settings_tags_added());
            setNewTag(null);
          }}
        >
          <input autoFocus placeholder={m.settings_tags_name_placeholder()} value={newTag} onChange={(e) => setNewTag(e.target.value)} className={`${input} w-48`} />
          <Button size="sm" type="submit" disabled={!newTag.trim()}>
            {m.settings_add()}
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => setNewTag(null)}>
            {m.settings_cancel()}
          </Button>
        </form>
      ) : null}
    </>
  );
}

function BoardRow({ board, onSave, onDelete }: { board: { id: string; name: string; description: string | null; count: number }; onSave: (name: string, description: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description ?? "");
  if (editing) {
    return (
      <form
        className="flex items-center gap-2 border-t py-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(name, description);
          setEditing(false);
        }}
      >
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={`${input} w-48`} />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={m.settings_boards_description_placeholder()} className={`${input} flex-1`} />
        <Button size="sm" type="submit" disabled={!name.trim()}>
          {m.settings_save()}
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)}>
          {m.settings_cancel()}
        </Button>
      </form>
    );
  }
  return (
    <div className="flex items-center gap-3.5 border-t py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-semibold">{board.name}</span>
        <span className="text-xs text-faint">{board.description || m.settings_boards_no_description()}</span>
      </div>
      <span className="text-xs text-faint tabular-nums">
        {m.settings_posts_count({ count: board.count })}
      </span>
      <More onEdit={() => setEditing(true)} onDelete={onDelete} />
    </div>
  );
}

function More({ onEdit, onDelete }: { onEdit?: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex size-[26px] items-center justify-center rounded-md text-faint outline-none hover:bg-accent hover:text-foreground">
        <DotsThreeIcon weight="bold" className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32">
        {onEdit ? <DropdownMenuItem onClick={onEdit}>{m.settings_edit()}</DropdownMenuItem> : null}
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          {m.settings_delete()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
