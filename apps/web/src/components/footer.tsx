import { m } from "@openheard/i18n/messages";
import { useLoaderData } from "@tanstack/react-router";

import { Kbd } from "./bits";
import { LanguageSwitch } from "./language-switch";

export default function Footer() {
  const data = useLoaderData({ from: "__root__" });
  const links = data?.links ?? { terms: "/terms", privacy: "/privacy", source: "https://github.com/Heilonng23/openheard" };
  return (
    <footer className="mx-auto flex w-full max-w-[1072px] flex-wrap items-center justify-center gap-x-4 gap-y-2 px-8 pt-4 pb-6 text-xs text-faint">
      <span className="hidden items-center gap-4 md:flex">
        <span className="inline-flex items-center gap-1.5">
          <Kbd>j</Kbd>
          <Kbd>k</Kbd> {m.footer_key_move()}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>v</Kbd> {m.footer_key_vote()}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>c</Kbd> {m.footer_key_new_post()}
        </span>
      </span>
      {!data || data.workspace.poweredBy ? (
        <span className="md:pl-4">
          {m.footer_powered_by()}{" "}
          <a href="https://github.com/Heilonng23/openheard" className="font-semibold text-muted-foreground hover:text-foreground">
            openheard
          </a>
        </span>
      ) : null}
      <a href={links.source} className="text-faint hover:text-muted-foreground">
        {m.footer_source()}
      </a>
      <a href={links.privacy} className="text-faint hover:text-muted-foreground">
        {m.footer_privacy()}
      </a>
      <a href={links.terms} className="text-faint hover:text-muted-foreground">
        {m.footer_terms()}
      </a>
      <LanguageSwitch />
    </footer>
  );
}
