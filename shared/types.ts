// Stats cache types (from ~/.claude/stats-cache.json)
export interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

export interface DailyModelTokens {
  date: string;
  tokensByModel: Record<string, number>;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests: number;
  costUSD: number;
  contextWindow: number;
  maxOutputTokens: number;
}

export interface LongestSession {
  sessionId: string;
  duration: number;
  messageCount: number;
  timestamp: string;
}

export interface StatsCache {
  version: number;
  lastComputedDate: string;
  dailyActivity: DailyActivity[];
  dailyModelTokens: DailyModelTokens[];
  modelUsage: Record<string, ModelUsage>;
  totalSessions: number;
  totalMessages: number;
  longestSession: LongestSession;
  firstSessionDate: string;
  hourCounts: Record<string, number>;
}

// Sessions index types (from ~/.claude/projects/*/sessions-index.json)
export interface SessionEntry {
  sessionId: string;
  fullPath: string;
  fileMtime: number;
  firstPrompt: string;
  messageCount: number;
  created: string;
  modified: string;
  gitBranch: string;
  projectPath: string;
  isSidechain: boolean;
}

export interface SessionsIndex {
  version: number;
  entries: SessionEntry[];
  originalPath: string;
}

// API response types
export interface OverviewResponse {
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  totalSessions: number;
  totalMessages: number;
  estimatedCostUSD: number;
  activeDays: number;
  firstSessionDate: string;
  lastComputedDate: string;
  modelBreakdown: Array<{
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    estimatedCostUSD: number;
    percentage: number;
  }>;
}

export interface ActivityResponse {
  daily: Array<{
    date: string;
    messageCount: number;
    sessionCount: number;
    toolCallCount: number;
    tokensByModel: Record<string, number>;
    totalTokens: number;
    estimatedCostUSD: number;
  }>;
}

export interface ProjectStats {
  name: string;
  displayName: string;
  totalSessions: number;
  totalMessages: number;
  branches: string[];
  firstActive: string;
  lastActive: string;
}

export interface ProjectsResponse {
  projects: ProjectStats[];
}

export interface ModelsResponse {
  models: Array<{
    model: string;
    displayName: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    totalTokens: number;
    estimatedCostUSD: number;
    percentage: number;
  }>;
  totalTokens: number;
  totalEstimatedCostUSD: number;
}

export interface SessionListItem {
  sessionId: string;
  project: string;
  projectDisplayName: string;
  gitBranch: string;
  messageCount: number;
  created: string;
  modified: string;
  firstPrompt: string;
  isSidechain: boolean;
}

export interface SessionsResponse {
  sessions: SessionListItem[];
  total: number;
}

export interface CostsResponse {
  daily: Array<{
    date: string;
    costByModel: Record<string, number>;
    totalCostUSD: number;
  }>;
  cumulative: Array<{
    date: string;
    cumulativeCostUSD: number;
    cumulativeByModel: Record<string, number>;
  }>;
  totalEstimatedCostUSD: number;
  thisMonthCostUSD: number;
}

export interface InsightsResponse {
  cacheHitRate: number;
  avgMessagesPerSession: number;
  peakHour: number;
  topModel: string;
  hourDistribution: Array<{ hour: number; count: number }>;
  longestSession: {
    sessionId: string;
    duration: number;
    messageCount: number;
    timestamp: string;
  };
}
