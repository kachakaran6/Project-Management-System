import { api } from "@/lib/api/axios-instance";
import { Status } from "@/types/task.types";

export const statusAPI = {
  fetchStatuses: () => api.get("/statuses"),
  createStatus: (data: Partial<Status>) => api.post("/statuses", data),
  updateStatus: (id: string, data: Partial<Status>) => api.put(`/statuses/${id}`, data),
  reorderStatuses: (reorderData: { id: string; order: number }[]) => api.put("/statuses/reorder", { reorderData }),
  deleteStatus: (id: string) => api.delete(`/statuses/${id}`),
};
