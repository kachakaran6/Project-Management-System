export type PageVisibility = "PRIVATE" | "WORKSPACE" | "PUBLIC";

export interface PageAuthor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

export interface PublicPageAuthor {
  name: string;
  avatarUrl?: string;
}

export interface PageDoc {
  id: string;
  title: string;
  content: string;
  visibility: PageVisibility;
  creatorId: string;
  creator?: PageAuthor;
  allowedUsers?: string[];
  publicId?: string | null;
  publicSlug?: string | null;
  publicUrl?: string | null;
  isPublished?: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface PublicPageDoc {
  title: string;
  content: string;
  publicUrl?: string | null;
  author?: PublicPageAuthor | null;
  updatedAt: string;
}

export interface PageFilters {
  page?: number;
  limit?: number;
  visibility?: PageVisibility;
  search?: string;
  createdByMe?: boolean;
  recentlyEdited?: boolean;
}

export interface CreatePageInput {
  title: string;
  content: string;
  visibility: PageVisibility;
  allowedUsers?: string[];
}

export interface UpdatePageInput {
  title?: string;
  content?: string;
  visibility?: PageVisibility;
  allowedUsers?: string[];
}
