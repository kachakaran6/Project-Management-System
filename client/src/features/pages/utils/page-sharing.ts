import { PageDoc } from "@/types/page.types";

export function slugifyPageTitle(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "page";
}

export function getPagePublicPath(page?: Pick<PageDoc, "publicUrl" | "publicSlug" | "publicId" | "title"> | null) {
  if (!page) {
    return null;
  }

  if (page.publicUrl) {
    return page.publicUrl;
  }

  if (page.publicSlug && page.publicId) {
    return `/p/${page.publicSlug}-${page.publicId}`;
  }

  return null;
}

export function getPagePublicPreviewPath(
  page?: Pick<PageDoc, "publicUrl" | "publicSlug" | "publicId" | "title"> | null,
) {
  const actualPath = getPagePublicPath(page);
  if (actualPath) {
    return actualPath;
  }

  return `/p/${slugifyPageTitle(page?.title || "page")}-generated-link-id`;
}

export function toAbsolutePublicUrl(path: string | null) {
  if (!path) {
    return null;
  }

  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}
