import { m } from "@openheard/i18n/messages";
import { Button } from "@openheard/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openheard/ui/components/dropdown-menu";
import { GearSixIcon } from "@phosphor-icons/react";
import { Link, useLoaderData, useRouter } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { DEMO_ADMIN_ID, isDemo } from "@/lib/demo";

import { Avatar } from "./bits";

export default function UserMenu() {
  const router = useRouter();
  const data = useLoaderData({ from: "__root__" });
  const user = data?.user;

  // Nobody signs up for the demo; one click puts them in its dashboard. A
  // customer who is signed in elsewhere arrives here as a guest and needs the
  // same button.
  if (isDemo(data?.workspace) && user?.id !== DEMO_ADMIN_ID) {
    return (
      <Button variant="outline" size="sm" nativeButton={false} render={<a href="/demo" />}>
        {m.nav_open_dashboard()}
      </Button>
    );
  }

  if (!user) {
    return (
      <Link to="/login">
        <Button variant="outline" size="sm">
          {m.nav_sign_in()}
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <Avatar name={user.name} image={user.image} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="text-[13px] font-semibold text-foreground">{user.name}</div>
            <div className="truncate">{user.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user.role === "admin" ? (
            <DropdownMenuItem render={<Link to="/dashboard/inbox" />}>
              <GearSixIcon className="size-4" /> {m.nav_dashboard()}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() =>
              authClient.signOut({ fetchOptions: { onSuccess: () => router.invalidate().then(() => router.navigate({ to: "/" })) } })
            }
          >
            {m.nav_sign_out()}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
