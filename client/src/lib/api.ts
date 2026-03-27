export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE_URL = "/api";

async function fetchApi<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (err: unknown) {
    throw new ApiError("NETWORK_ERROR", `Cannot connect to server: ${(err as Error).message}`, 0);
  }

  if (!response.ok) {
    let body: { code?: string; message?: string } | null = null;
    try {
      body = await response.json();
    } catch {
      // response body isn't JSON
    }

    throw new ApiError(
      body?.code || "API_ERROR",
      body?.message || `API error: ${response.status}`,
      response.status,
    );
  }

  return response.json();
}

async function postApi<T>(endpoint: string, body: unknown): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`, window.location.origin);
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err: unknown) {
    throw new ApiError("NETWORK_ERROR", `Cannot connect to server: ${(err as Error).message}`, 0);
  }

  if (!response.ok) {
    let data: { code?: string; message?: string } | null = null;
    try {
      data = await response.json();
    } catch {
      // not JSON
    }
    throw new ApiError(data?.code || "API_ERROR", data?.message || `API error: ${response.status}`, response.status);
  }

  return response.json();
}

export const api = {
  getHealth: () => fetchApi("/health"),
  getOverview: () => fetchApi("/overview"),
  getActivity: (range?: string) => fetchApi("/activity", range ? { range } : undefined),
  getProjects: () => fetchApi("/projects"),
  getProjectSessions: (name: string) => fetchApi(`/projects/${encodeURIComponent(name)}/sessions`),
  getModels: () => fetchApi("/models"),
  getSessions: () => fetchApi("/sessions"),
  getSessionDetail: (id: string) => fetchApi(`/sessions/${id}`),
  getCosts: (range?: string) => fetchApi("/costs", range ? { range } : undefined),
  getCostsAdmin: () => fetchApi("/costs/admin"),
  getInsights: () => fetchApi("/insights"),
  getMode: () => fetchApi<{ mode: string; apiKeyConfigured: boolean }>("/mode"),
  setMode: (mode: string) => postApi<{ mode: string }>("/mode", { mode }),
};
