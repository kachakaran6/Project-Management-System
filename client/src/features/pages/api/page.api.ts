import { api } from "@/lib/api/axios-instance";
import { ApiResponse, PaginatedResult } from "@/types/api.types";
import {
  CreatePageInput,
  PageDoc,
  PageFilters,
  PageVisibility,
  UpdatePageInput,
} from "@/types/page.types";

type RawAuthor = {
  id?: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
};

type RawPage = {
  id?: string;
  _id?: string;
  title?: string;
  content?: string;
  visibility?: string;
  creatorId?: string;
  ownerId?: string;
  createdBy?: RawAuthor;
  creator?: RawAuthor;
  updatedAt?: string;
  createdAt?: string;
};

function asVisibility(value: unknown): PageVisibility {
  return String(value).toUpperCase() === "PUBLIC" ? "PUBLIC" : "PRIVATE";
}

function mapAuthor(raw?: RawAuthor) {
  if (!raw) return undefined;

  const id = raw.id || raw._id;
  if (!id) return undefined;

  return {
    id,
    firstName: raw.firstName ?? "",
    lastName: raw.lastName ?? "",
    email: raw.email ?? "",
    avatarUrl: raw.avatarUrl,
  };
}

function mapPage(raw: RawPage): PageDoc {
  const author = mapAuthor(raw.creator ?? raw.createdBy);

  return {
    id: raw.id || raw._id || "",
    title: raw.title ?? "Untitled page",
    content: raw.content ?? "",
    visibility: asVisibility(raw.visibility),
    creatorId: raw.creatorId || raw.ownerId || author?.id || "",
    creator: author,
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    createdAt: raw.createdAt || raw.updatedAt || new Date().toISOString(),
  };
}

function normalizePageList(payload: unknown): PaginatedResult<PageDoc> {
  if (Array.isArray(payload)) {
    return {
      items: payload.map((item) => mapPage(item as RawPage)),
      meta: {
        totalItems: payload.length,
        itemCount: payload.length,
        itemsPerPage: payload.length,
        totalPages: 1,
        currentPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  const data = (payload ?? {}) as {
    items?: RawPage[];
    pages?: RawPage[];
    meta?: PaginatedResult<PageDoc>["meta"];
    totalCount?: number;
  };

  const itemsSource = data.items ?? data.pages ?? [];
  const items = itemsSource.map((item) => mapPage(item));
  const totalItems = data.meta?.totalItems ?? data.totalCount ?? items.length;
  const currentPage = data.meta?.currentPage ?? 1;
  const totalPages = data.meta?.totalPages ?? 1;

  return {
    items,
    meta: {
      totalItems,
      itemCount: items.length,
      itemsPerPage: data.meta?.itemsPerPage ?? items.length,
      totalPages,
      currentPage,
      hasNextPage: data.meta?.hasNextPage ?? currentPage < totalPages,
      hasPreviousPage: data.meta?.hasPreviousPage ?? currentPage > 1,
    },
  };
}

function normalizeSinglePage(payload: unknown): PageDoc {
  const raw = (payload ?? {}) as { page?: RawPage } & RawPage;
  return mapPage(raw.page ?? raw);
}

export const pageApi = {
  async getPages(
    filters: PageFilters = {},
  ): Promise<ApiResponse<PaginatedResult<PageDoc>>> {
    const response = await api.get<ApiResponse<unknown>>("/pages", {
      params: filters,
    });

    return {
      ...response.data,
      data: normalizePageList(response.data.data),
    };
  },

  async getPage(id: string): Promise<ApiResponse<PageDoc>> {
    const response = await api.get<ApiResponse<unknown>>(`/pages/${id}`);
    return {
      ...response.data,
      data: normalizeSinglePage(response.data.data),
    };
  },

  async createPage(data: CreatePageInput): Promise<ApiResponse<PageDoc>> {
    const response = await api.post<ApiResponse<unknown>>("/pages", data);
    return {
      ...response.data,
      data: normalizeSinglePage(response.data.data),
    };
  },

  async updatePage(
    id: string,
    data: UpdatePageInput,
  ): Promise<ApiResponse<PageDoc>> {
    const response = await api.patch<ApiResponse<unknown>>(`/pages/${id}`, data);
    return {
      ...response.data,
      data: normalizeSinglePage(response.data.data),
    };
  },

  async deletePage(id: string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/pages/${id}`);
    return response.data;
  },
};
