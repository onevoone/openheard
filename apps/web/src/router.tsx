import { m } from "@openheard/i18n/messages";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import Loader from "./components/loader";
import { registerClientLocaleStrategy } from "./lib/locale-client";
import { routeTree } from "./routeTree.gen";

registerClientLocaleStrategy();

export const getRouter = () => {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultStructuralSharing: true,
    defaultPreload: "intent",
    defaultPendingMs: 3_000,
    defaultPendingMinMs: 0,
    defaultStaleTime: 60_000,
    defaultGcTime: 300_000,
    defaultViewTransition: true,
    context: { user: null },
    defaultPendingComponent: () => <Loader />,
    defaultNotFoundComponent: () => (
      <main className="mx-auto max-w-3xl px-8 py-24 text-center">
        <h1 className="text-xl font-semibold">{m.not_found_title()}</h1>
        <p className="mt-2 text-muted-foreground">{m.not_found_text_page()}</p>
        <a href="/" className="mt-4 inline-block text-sm font-medium hover:underline">{m.not_found_back()}</a>
      </main>
    ),
  });

  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
