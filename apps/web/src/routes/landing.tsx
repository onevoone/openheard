import { m } from "@openheard/i18n/messages";
import { createFileRoute } from "@tanstack/react-router";

import { Landing } from "@/components/landing/page";

// Preview of the marketing page. In the cloud it is also served at the root
// domain, see __root.tsx.
export const Route = createFileRoute("/landing")({
  head: () => {
    const title = m.landing_meta_title();
    const description = m.landing_meta_description();
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
    };
  },
  component: Landing,
});
