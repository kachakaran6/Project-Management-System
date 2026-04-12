export type SearchResultType = "project" | "task" | "user" | "message";

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  createdAt?: string;
  matchedText?: string;
}

export interface SearchResults {
  projects: SearchResultItem[];
  tasks: SearchResultItem[];
  users: SearchResultItem[];
  messages: SearchResultItem[];
  meta: {
    totalItems: number;
  };
}

export interface SearchFilters {
  q: string;
  type?: "all" | "projects" | "tasks" | "users" | "messages";
}