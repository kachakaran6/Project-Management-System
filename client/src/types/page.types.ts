export type PageVisibility = "PUBLIC" | "PRIVATE";

export interface PageAuthor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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
  updatedAt: string;
  createdAt: string;
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
