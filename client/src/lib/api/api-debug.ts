export const isApiDebugEnabled =
  !import.meta.env.PROD &&
  import.meta.env.VITE_API_DEBUG !== "false";

export interface ApiLogEntry {
  id: string;
  type: "request" | "response" | "error";
  method: string;
  url: string;
  status?: number;
  timestamp: string;
  payload?: unknown;
}

const apiLogStore: ApiLogEntry[] = [];
const MAX_LOG_ENTRIES = 300;

function pushApiLog(entry: Omit<ApiLogEntry, "id" | "timestamp">) {
  const next: ApiLogEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };

  apiLogStore.unshift(next);
  if (apiLogStore.length > MAX_LOG_ENTRIES) {
    apiLogStore.length = MAX_LOG_ENTRIES;
  }
}

export function getApiLogs() {
  return [...apiLogStore];
}

export function clearApiLogs() {
  apiLogStore.length = 0;
}

export function logApiRequest(method: string, url: string, data?: unknown) {
  pushApiLog({
    type: "request",
    method: method.toUpperCase(),
    url,
    payload: data,
  });

  if (!isApiDebugEnabled) return;
  console.info(`[API][REQ] ${method.toUpperCase()} ${url}`, data ?? "");
}

export function logApiResponse(
  method: string,
  url: string,
  status: number,
  data?: unknown,
) {
  pushApiLog({
    type: "response",
    method: method.toUpperCase(),
    url,
    status,
    payload: data,
  });

  if (!isApiDebugEnabled) return;
  console.info(
    `[API][RES] ${method.toUpperCase()} ${url} (${status})`,
    data ?? "",
  );
}

export function logApiError(
  method: string,
  url: string,
  status?: number,
  data?: unknown,
) {
  pushApiLog({
    type: "error",
    method: method.toUpperCase(),
    url,
    status,
    payload: data,
  });

  if (!isApiDebugEnabled) return;
  
  const isExpectedError = status === 401 || status === 404;
  const logFn = isExpectedError ? console.warn : console.error;
  
  logFn(
    `[API][${isExpectedError ? "WTN" : "ERR"}] ${method.toUpperCase()} ${url}${status ? ` (${status})` : ""}`,
    data ?? "",
  );
}
