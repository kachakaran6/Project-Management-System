import { CalendarDays, FileText, Globe } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "@/lib/next-navigation";
import { usePublicPageQuery } from "@/features/pages/hooks/use-pages-query";
import { sanitizePageHtmlForDisplay } from "@/features/pages/utils/page-html";

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
          <div className="mb-8 h-14 w-3/4 rounded-2xl bg-muted/40" />
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
        <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-border/50 bg-card/60 px-8 py-14 text-center shadow-sm">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/60">
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.03),transparent_35%)] bg-background px-4 py-8 text-foreground md:px-6 md:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
          <Globe className="size-3.5" />
          Public Page
        </div>

        <article className="overflow-hidden rounded-[28px] border border-border/50 bg-card/80 shadow-sm backdrop-blur">
          <header className="border-b border-border/50 px-6 py-7 md:px-10 md:py-9">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <h1 className="text-3xl font-black tracking-tight text-foreground md:text-5xl">
                  {page.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Shared as a read-only public page.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {page.author?.name ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1.5">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={page.author.avatarUrl} alt={page.author.name} />
                      <AvatarFallback className="text-[10px] font-bold">
                        {authorInitials(page.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground/85">{page.author.name}</span>
                  </div>
                ) : null}

                <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1.5">
                  <CalendarDays className="size-4" />
                  <span>Updated {new Date(page.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </header>

          <div className="px-6 py-8 md:px-10 md:py-10">
            <div
              className="prose prose-slate dark:prose-invert max-w-none text-[16px] leading-8 text-foreground/90
              [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4
              [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic
              [&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5
              [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100
              [&_ul[data-type='taskList']]:list-none [&_ul[data-type='taskList']]:pl-0
              [&_li[data-type='taskItem']]:my-2 [&_li[data-type='taskItem']>label]:mr-3 [&_li[data-type='taskItem']>label]:inline-flex
              [&_input[type='checkbox']]:pointer-events-none"
              dangerouslySetInnerHTML={{
                __html: contentHtml || "<p>No content available.</p>",
              }}
            />
          </div>
        </article>
      </div>
    </div>
  );
}
