import { CalendarDays, FileText, Globe } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "@/lib/next-navigation";
import { usePublicPageQuery } from "@/features/pages/hooks/use-pages-query";
import { sanitizePageHtmlForDisplay } from "@/features/pages/utils/page-html";

// Import editor CSS for consistent documentation styling
import "@/features/pages/editor/editor.css";

function authorInitials(name?: string | null) {
  if (!name) return "P";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() ||
    parts[0]?.slice(0, 2).toUpperCase() ||
    "P"
  );
}

export default function PublicPageView() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug ?? "";

  const publicPageQuery = usePublicPageQuery(slug, Boolean(slug));
  const page = publicPageQuery.data?.data;
  const contentHtml = sanitizePageHtmlForDisplay(page?.content || "");

  if (publicPageQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-foreground">
        <div className="mx-auto max-w-4xl animate-pulse">
          <div className="mb-4 h-4 w-32 rounded-full bg-muted/40" />
          <div className="mb-8 h-14 w-3/4 rounded-card bg-muted/40" />
          <div className="space-y-4">
            <div className="h-4 w-full rounded bg-muted/30" />
            <div className="h-4 w-full rounded bg-muted/30" />
            <div className="h-4 w-2/3 rounded bg-muted/30" />
          </div>
        </div>
      </div>
    );
  }

  if (publicPageQuery.isError || !page) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-foreground">
        <div className="mx-auto flex max-w-xl flex-col items-center rounded-card border border-border/50 bg-card/60 px-8 py-14 text-center shadow-sm">
          <div className="mb-4 flex size-14 items-center justify-center rounded-card bg-muted/60">
            <FileText className="size-6 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This public page is unavailable. It may be private, unpublished, or the link may be incorrect.
          </p>
          <Button className="mt-6" variant="outline" onClick={() => router.push("/login")}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      {/* Premium Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(var(--primary-rgb,59,130,246),0.08),transparent_50%),linear-gradient(to_bottom,rgba(var(--primary-rgb,59,130,246),0.02),transparent_100%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(var(--primary-rgb,59,130,246),0.12),transparent_50%),linear-gradient(to_bottom,rgba(var(--primary-rgb,59,130,246),0.02),transparent_100%)]" />

      <div className="relative z-10 mx-auto max-w-[48rem] px-5 py-12 md:py-20 lg:py-28">
        {/* Top Label */}
        <div className="mb-10 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
            <Globe className="size-3.5" />
          </div>
          <span className="text-[13px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
            Public Document
          </span>
        </div>

        <article className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          <header className="mb-14">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-[4rem] lg:leading-[1.1]">
              {page.title}
            </h1>
            
            <div className="mt-8 flex flex-wrap items-center gap-5 border-y border-border/40 py-5">
              {page.author?.name ? (
                <div className="flex items-center gap-3">
                  <Avatar className="size-9 ring-1 ring-border/50">
                    <AvatarImage src={page.author.avatarUrl} alt={page.author.name} />
                    <AvatarFallback className="bg-muted/50 text-[11px] font-bold text-foreground/70">
                      {authorInitials(page.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-medium text-foreground/90">
                      {page.author.name}
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                      Author
                    </span>
                  </div>
                </div>
              ) : null}

              {page.author?.name && <div className="h-8 w-px bg-border/40" />}

              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted/40 ring-1 ring-border/50">
                  <CalendarDays className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-foreground/90">
                    {new Date(page.updatedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    Last Updated
                  </span>
                </div>
              </div>
            </div>
          </header>

          <div className="page-editor !text-[16px] !leading-relaxed">
            <div
              dangerouslySetInnerHTML={{
                __html: contentHtml || "<p className='text-muted-foreground italic'>This document is currently empty.</p>",
              }}
            />
          </div>
        </article>
        
        <footer className="mt-24 border-t border-border/40 pt-8 pb-12 flex justify-between items-center text-sm text-muted-foreground">
          <span>Powered by Project Management System</span>
          <Button variant="ghost" size="sm" asChild className="hover:bg-muted/50">
            <a href="/">Go to App</a>
          </Button>
        </footer>
      </div>
    </div>
  );
}
