// Types for Anthropic Admin API responses

// === Usage Report (Messages) ===
// GET /v1/organizations/usage_report/messages

export interface UsageReportCacheCreation {
	ephemeral_1h_input_tokens: number;
	ephemeral_5m_input_tokens: number;
}

export interface UsageReportResult {
	api_key_id: string | null;
	cache_creation: UsageReportCacheCreation;
	cache_read_input_tokens: number;
	context_window: "0-200k" | "200k-1M" | null;
	inference_geo: string | null;
	model: string | null;
	output_tokens: number;
	server_tool_use: { web_search_requests: number };
	service_tier: string | null;
	speed: "standard" | "fast" | null;
	uncached_input_tokens: number;
	workspace_id: string | null;
}

export interface UsageReportBucket {
	starting_at: string;
	ending_at: string;
	results: UsageReportResult[];
}

export interface UsageReportResponse {
	data: UsageReportBucket[];
	has_more: boolean;
	next_page: string | null;
}

// === Cost Report ===
// GET /v1/organizations/cost_report

export interface CostReportResult {
	amount: string; // cents as decimal string, e.g. "123.45" = $1.2345
	context_window: "0-200k" | "200k-1M" | null;
	cost_type: "tokens" | "web_search" | "code_execution" | null;
	currency: string;
	description: string | null;
	inference_geo: string | null;
	model: string | null;
	service_tier: "standard" | "batch" | null;
	speed: "standard" | "fast" | null;
	token_type: string | null;
	workspace_id: string | null;
}

export interface CostReportBucket {
	starting_at: string;
	ending_at: string;
	results: CostReportResult[];
}

export interface CostReportResponse {
	data: CostReportBucket[];
	has_more: boolean;
	next_page: string | null;
}

// === Claude Code Usage Report ===
// GET /v1/organizations/usage_report/claude_code

export interface ClaudeCodeModelBreakdown {
	model: string;
	tokens: {
		input: number;
		output: number;
		cache_read: number;
		cache_creation: number;
	};
	estimated_cost: {
		amount: number; // cents
		currency: string;
	};
}

export interface ClaudeCodeToolAction {
	accepted: number;
	rejected: number;
}

export interface ClaudeCodeRecord {
	date: string;
	actor:
		| { type: "user_actor"; email_address: string }
		| { type: "api_actor"; api_key_name: string };
	organization_id: string;
	customer_type: "api" | "subscription";
	terminal_type: string;
	core_metrics: {
		num_sessions: number;
		lines_of_code: { added: number; removed: number };
		commits_by_claude_code: number;
		pull_requests_by_claude_code: number;
	};
	model_breakdown: ClaudeCodeModelBreakdown[];
	tool_actions: Record<string, ClaudeCodeToolAction>;
	subscription_type?: "enterprise" | "team" | null;
}

export interface ClaudeCodeReportResponse {
	data: ClaudeCodeRecord[];
	has_more: boolean;
	next_page: string | null;
}
