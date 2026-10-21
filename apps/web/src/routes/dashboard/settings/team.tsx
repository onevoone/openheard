import { m } from "@openheard/i18n/messages";
import { Button } from "@openheard/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@openheard/ui/components/dropdown-menu";
import { CaretDownIcon, EnvelopeSimpleIcon, TrashSimpleIcon, XIcon } from "@phosphor-icons/react";
import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import { SectionHead } from "@/components/admin/panel";
import { Avatar } from "@/components/bits";
import { listMembers, setRole } from "@/functions/admin";
import { createInvite, listInvites, removeMember, revokeInvite } from "@/functions/invites";
import { since } from "@/lib/time";
import { PageHead } from "@/routes/dashboard/settings";
import { useState } from "react";

export const Route = createFileRoute("/dashboard/settings/team")({
  loader: async () => {
    const [members, invites] = await Promise.all([listMembers(), listInvites()]);
    return { members, invites };
  },
  head: () => ({ meta: [{ title: m.settings_team_meta() }] }),
  component: Team,
});

const roleLabel = (role: string) => (role === "admin" ? m.settings_team_role_admin() : m.settings_team_role_member());

function Team() {
  const { members, invites } = Route.useLoaderData();
  const root = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const admins = members.filter((p) => p.role === "admin").length;

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteBusy(true);
    try {
      await createInvite({ data: { email: inviteEmail } });
      setInviteEmail("");
      toast.success(m.settings_team_invite_sent({ email: inviteEmail }));
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message ?? m.settings_team_invite_failed());
    }
    setInviteBusy(false);
  }

  return (
    <>
      <PageHead title={m.settings_team_title()} sub={m.settings_team_sub()} />
      <form className="flex items-center gap-2 rounded-lg border bg-card py-2.5 pr-2.5 pl-3.5" onSubmit={handleInvite}>
        <EnvelopeSimpleIcon className="size-3.5 text-faint" />
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          required
          placeholder="teammate@company.com"
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-faint"
        />
        <Button size="sm" arrow type="submit" disabled={inviteBusy}>
          {inviteBusy ? m.settings_sending() : m.settings_team_invite_send()}
        </Button>
      </form>

      {invites.length > 0 ? (
        <div className="pt-5">
          <SectionHead title={m.settings_team_invites()} right={<span className="text-xs text-faint">{invites.length}</span>} />
          {invites.map((inv) => (
            <div key={inv.token} className="flex items-center gap-3 border-t py-2.5">
              <EnvelopeSimpleIcon className="size-3.5 text-faint" />
              <span className="min-w-0 flex-1 truncate text-[13px]">{inv.email}</span>
              <span className="text-xs text-faint">{roleLabel(inv.role)}</span>
              <span className="text-xs text-faint">{since(inv.createdAt)}</span>
              <button
                type="button"
                className="rounded p-1 text-faint hover:bg-accent hover:text-foreground"
                onClick={() =>
                  revokeInvite({ data: { token: inv.token } })
                    .then(() => router.invalidate())
                    .then(() => toast.success(m.settings_team_invite_revoked()))
                    .catch((e) => toast.error(e.message))
                }
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="pt-7">
        <SectionHead title={m.settings_team_people()} right={<span className="text-xs text-faint">{m.settings_team_admins({ count: admins })}</span>} />
      </div>
      {members.map((person) => {
        const you = person.id === root.user?.id;
        return (
          <div key={person.id} className="flex items-center gap-3 border-t py-3">
            <Avatar name={person.name} image={person.image} size={30} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                {person.name}
                {you ? <span className="rounded-full bg-secondary px-1.5 text-[11px] font-normal text-faint">{m.settings_team_you()}</span> : null}
              </span>
              <span className="text-xs text-faint">{person.email}</span>
            </div>
            <span className="text-xs text-faint">{m.settings_team_joined({ when: since(person.createdAt) })}</span>
            <DropdownMenu>
              <DropdownMenuTrigger disabled={you} className="inline-flex h-[26px] items-center gap-1.5 rounded-md border border-input bg-card px-2 text-xs outline-none hover:bg-accent disabled:opacity-60">
                {roleLabel(person.role)} <CaretDownIcon className="size-2.5 text-faint" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-32">
                {(["admin", "member"] as const).map((r) => (
                  <DropdownMenuItem
                    key={r}
                    disabled={r === person.role}
                    onClick={() =>
                      setRole({ data: { userId: person.id, role: r } })
                        .then(() => router.invalidate())
                        .then(() => toast.success(m.settings_team_role_changed({ name: person.name, role: roleLabel(r).toLowerCase() })))
                        .catch((e) => toast.error(e.message))
                    }
                  >
                    {roleLabel(r)}
                  </DropdownMenuItem>
                ))}
                {!you ? (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() =>
                      removeMember({ data: { userId: person.id } })
                        .then(() => router.invalidate())
                        .then(() => toast.success(m.settings_team_removed({ name: person.name })))
                        .catch((e) => toast.error(e.message))
                    }
                  >
                    <TrashSimpleIcon className="mr-1.5 size-3.5" /> {m.settings_team_remove()}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}
    </>
  );
}
