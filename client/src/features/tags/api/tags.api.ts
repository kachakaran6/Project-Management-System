import { api } from "@/lib/api/axios-instance";

export interface Tag {
  id: string;
  name: string;
  label: string;
  color: string;
  icon: string;
  organizationId: string;
  workspaceId?: string;
  createdBy: string;
  createdAt: string;
}

export const tagsApi = {
  getTags: async (orgId: string, wsId?: string) => {
    const res = await api.get(`/tags`, {
      params: { organizationId: orgId, workspaceId: wsId }
    });
    return res.data.data as Tag[];
  },

  createTag: async (data: Partial<Tag>) => {
    const res = await api.post(`/tags`, data);
    return res.data.data as Tag;
  },

  updateTag: async (id: string, data: Partial<Tag>) => {
    const res = await api.put(`/tags/${id}`, data);
    return res.data.data as Tag;
  },

  deleteTag: async (id: string) => {
    const res = await api.delete(`/tags/${id}`);
    return res.data;
  },

  assignTags: async (taskId: string, tagIds: string[]) => {
    const res = await api.post(`/tags/task/${taskId}`, { tagIds });
    return res.data;
  },

  removeTagFromTask: async (taskId: string, tagId: string) => {
    const res = await api.delete(`/tags/task/${taskId}/${tagId}`);
    return res.data;
  }
};
