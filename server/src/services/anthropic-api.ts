import { config } from "../config.js";

const BASE_URL = "https://api.anthropic.com/v1/organizations";

export type ApiResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: "NOT_CONFIGURED" | "API_KEY_INVALID" | "RATE_LIMITED" | "NETWORK_ERROR" | "API_ERROR"; message: string };

async function fetchAnthropicAdmin<T = unknown>(endpoint: string, params: Record<string, string> = {}): Promise<ApiResult<T>> {
  if (!config.anthropicAdminApiKey) {
    return { ok: false, error: "NOT_CONFIGURED", message: "Admin API key not configured" };
  }

  const url = new URL(`${BASE_URL}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "x-api-key": config.anthropicAdminApiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: "API_KEY_INVALID", message: "Admin API key is invalid or lacks permission. Check your key at console.anthropic.com/settings/admin-keys." };
    }

    if (response.status === 429) {
      return { ok: false, error: "RATE_LIMITED", message: "Anthropic API rate limit reached. Try again in a few minutes." };
    }

    if (!response.ok) {
      return { ok: false, error: "API_ERROR", message: `Anthropic API returned ${response.status}` };
    }

    const data = await response.json() as T;
    return { ok: true, data };
  } catch (err: unknown) {
    return { ok: false, error: "NETWORK_ERROR", message: `Cannot reach Anthropic API: ${(err as Error).message}` };
  }
}

export async function getUsageReport(startDate: string, endDate: string) {
  return fetchAnthropicAdmin("usage_report/messages", {
    start_date: startDate,
    end_date: endDate,
    bucket_size: "day",
  });
}

export async function getCostReport(startDate: string, endDate: string) {
  return fetchAnthropicAdmin("cost_report", {
    start_date: startDate,
    end_date: endDate,
  });
}

export function isAdminApiConfigured(): boolean {
  return !!config.anthropicAdminApiKey;
}
