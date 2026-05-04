import { api } from "@/lib/api/axios-instance";

/**
 * @deprecated Use `api` from `@/lib/api/axios-instance` instead.
 * This is kept as a default export for backward compatibility with older components.
 */
const apiClient = api;

export default apiClient;
