import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { updateSettings, useSettings } from "@/lib/settings";
import { Moon, Sun } from "lucide-react";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { shouldReloadForChunkError } from "@/lib/chunk-reload";

// A stale chunk name (the app was rebuilt under an open page) only needs a fresh
// document; reload once instead of leaving the error screen up.
function reloadForChunkError(error: unknown) {
  if (shouldReloadForChunkError(error)) window.location.reload();
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    reloadForChunkError(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ScholarAlloc — Intelligent Scholarship Allocation" },
      { name: "description", content: "DSA-driven scholarship allocation for SDG-4 Quality Education." },
      { property: "og:title", content: "ScholarAlloc — Intelligent Scholarship Allocation" },
      { property: "og:description", content: "DSA-driven scholarship allocation for SDG-4 Quality Education." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&family=Sora:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const settings = useSettings();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);
  useEffect(() => {
    queryClient.invalidateQueries();
  }, [settings.mockMode, settings.baseUrl, queryClient]);
  useEffect(() => {
    const recover = (event: Event) => {
      const reason = (event as PromiseRejectionEvent).reason ?? (event as ErrorEvent).error ?? event;
      reloadForChunkError(reason);
    };
    window.addEventListener("unhandledrejection", recover);
    window.addEventListener("error", recover);
    return () => {
      window.removeEventListener("unhandledrejection", recover);
      window.removeEventListener("error", recover);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur">
              <SidebarTrigger />
              <span className="font-display text-sm font-semibold text-foreground md:hidden">ScholarAlloc</span>
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden rounded-full border px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline">
                  {settings.mockMode ? "MOCK" : settings.baseUrl}
                </span>
                <button
                  aria-label="Toggle theme"
                  className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })}
                >
                  {settings.theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </div>
            </header>
            <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
