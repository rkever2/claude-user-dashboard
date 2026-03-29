import { config } from "../config.js";
import type {
	UsageReportResponse,
	CostReportResponse,
	ClaudeCodeReportResponse,
} from "./anthropic-api-types.js";

const BASE_URL = "https://api.anthropic.com/v1/organizations";

export type ApiResult<T = unknown> =
	| { ok: true; data: T }
	| {
			ok: false;
			error: "NOT_CONFIGURED" | "API_KEY_INVALID" | "RATE_LIMITED" | "NETWORK_ERROR" | "API_ERROR";
			message: string;
	  };

async function fetchAnthropicAdmin<T = unknown>(
	endpoint: string,
	params: Record<string, string | string[]> = {},
): Promise<ApiResult<T>> {
	if (!config.anthropicAdminApiKey) {
		return { ok: false, error: "NOT_CONFIGURED", message: "Admin API key not configured" };
	}

	const url = new URL(`${BASE_URL}/${endpoint}`);
	for (const [k, value] of Object.entries(params)) {
		if (Array.isArray(value)) {
			for (const v of value) {
				url.searchParams.append(k, v);
			}
		} else {
			url.searchParams.set(k, value);
		}
	}

	try {
		const response = await fetch(url.toString(), {
			headers: {
				"x-api-key": config.anthropicAdminApiKey,
				"anthropic-version": "2023-06-01",
			},
		});

		if (response.status === 401 || response.status === 403) {
			return {
				ok: false,
				error: "API_KEY_INVALID",
				message:
					"Admin API key is invalid or lacks permission. Check your key at console.anthropic.com/settings/admin-keys.",
			};
		}

		if (response.status === 429) {
			return {
				ok: false,
				error: "RATE_LIMITED",
				message: "Anthropic API rate limit reached. Try again in a few minutes.",
			};
		}

		if (!response.ok) {
			return { ok: false, error: "API_ERROR", message: `Anthropic API returned ${response.status}` };
		}

		const data = (await response.json()) as T;
		return { ok: true, data };
	} catch (err: unknown) {
		return { ok: false, error: "NETWORK_ERROR", message: `Cannot reach Anthropic API: ${(err as Error).message}` };
	}
}

export async function getUsageReport(
	startDate: string,
	endDate: string,
	groupBy?: string[],
): Promise<ApiResult<UsageReportResponse>> {
	const params: Record<string, string | string[]> = {
		starting_at: `${startDate}T00:00:00Z`,
		ending_at: `${endDate}T23:59:59Z`,
		bucket_width: "1d",
		limit: "31",
	};
	if (groupBy?.length) {
		params["group_by[]"] = groupBy;
	}
	return fetchAnthropicAdmin<UsageReportResponse>("usage_report/messages", params);
}

export async function getCostReport(
	startDate: string,
	endDate: string,
): Promise<ApiResult<CostReportResponse>> {
	return fetchAnthropicAdmin<CostReportResponse>("cost_report", {
		starting_at: `${startDate}T00:00:00Z`,
		ending_at: `${endDate}T23:59:59Z`,
		bucket_width: "1d",
		limit: "31",
		"group_by[]": ["description"],
	});
}

export async function getClaudeCodeReport(
	startDate: string,
): Promise<ApiResult<ClaudeCodeReportResponse>> {
	return fetchAnthropicAdmin<ClaudeCodeReportResponse>("usage_report/claude_code", {
		starting_at: startDate,
		limit: "1000",
	});
}

export function isAdminApiConfigured(): boolean {
	return !!config.anthropicAdminApiKey;
}
