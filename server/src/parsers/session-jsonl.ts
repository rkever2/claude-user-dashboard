import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";

export interface SessionMessage {
  type: string;
  timestamp?: string;
  model?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  toolUses?: string[];
}

export interface SessionDetail {
  sessionId: string;
  messages: SessionMessage[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  models: string[];
  toolUseCounts: Record<string, number>;
  startTime?: string;
  endTime?: string;
}

export async function parseSessionJsonl(fullPath: string): Promise<SessionDetail> {
  const raw = await fs.readFile(fullPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());

  const messages: SessionMessage[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheWriteTokens = 0;
  const modelsSet = new Set<string>();
  const toolUseCounts: Record<string, number> = {};
  let startTime: string | undefined;
  let endTime: string | undefined;

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      if (entry.timestamp) {
        if (!startTime) startTime = entry.timestamp;
        endTime = entry.timestamp;
      }

      if (entry.type === "assistant" && entry.message) {
        const usage = entry.message.usage;
        const model = entry.message.model;

        if (model) modelsSet.add(model);

        if (usage) {
          totalInputTokens += usage.input_tokens || 0;
          totalOutputTokens += usage.output_tokens || 0;
          totalCacheReadTokens += usage.cache_read_input_tokens || 0;
          totalCacheWriteTokens += usage.cache_creation_input_tokens || 0;
        }

        // Count tool uses
        const content = entry.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "tool_use") {
              const toolName = block.name || "unknown";
              toolUseCounts[toolName] = (toolUseCounts[toolName] || 0) + 1;
            }
          }
        }

        messages.push({
          type: "assistant",
          timestamp: entry.timestamp,
          model,
          usage: usage
            ? {
                input_tokens: usage.input_tokens || 0,
                output_tokens: usage.output_tokens || 0,
                cache_read_input_tokens: usage.cache_read_input_tokens || 0,
                cache_creation_input_tokens: usage.cache_creation_input_tokens || 0,
              }
            : undefined,
        });
      } else if (entry.type === "user") {
        messages.push({
          type: "user",
          timestamp: entry.timestamp,
        });
      }
    } catch {
      // Skip malformed lines
    }
  }

  const sessionId = path.basename(fullPath, ".jsonl");

  return {
    sessionId,
    messages,
    totalInputTokens,
    totalOutputTokens,
    totalCacheReadTokens,
    totalCacheWriteTokens,
    models: Array.from(modelsSet),
    toolUseCounts,
    startTime,
    endTime,
  };
}
