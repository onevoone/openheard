import { m } from "@openheard/i18n/messages";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@openheard/ui/components/button";
import { WorkspaceLogo } from "@/components/logo";
import { getUser } from "@/functions/get-user";
import { acceptInvite } from "@/functions/invites";

export const Route = createFileRoute("/join/$token")({
  head: () => ({ meta: [{ title: m.join_head() }] }),
  beforeLoad: async ({ params }) => {
    const user = await getUser();
    if (!user) throw redirect({ to: "/login", search: { redirect: `/join/${params.token}` } });
  },
  component: JoinPage,
});

function JoinPage() {
  const { token } = Route.useParams();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function accept() {
    setBusy(true);
    try {
      await acceptInvite({ data: { token } });
      setDone(true);
      toast.success(m.join_joined());
      setTimeout(() => {
        router.navigate({ to: "/" });
      }, 1500);
    } catch (e: any) {
      setError(e.message ?? m.join_failed());
    }
    setBusy(false);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <div className="flex w-full max-w-[380px] flex-col items-center gap-6">
        <WorkspaceLogo size={32} />
        {done ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{m.join_done_title()}</h1>
            <p className="text-sm text-muted-foreground">{m.join_redirecting()}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{m.join_problem()}</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link to="/" className="mt-2 text-sm text-faint hover:text-foreground">
              {m.common_go_board()}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{m.join_title()}</h1>
              <p className="text-sm text-muted-foreground">{m.join_text()}</p>
            </div>
            <Button full arrow size="lg" disabled={busy} onClick={accept}>
              {busy ? m.join_joining() : m.join_title()}
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
