import path from "path";

export const config = {
  port: parseInt(process.env.PORT || "3080", 10),
  claudeDataDir: process.env.CLAUDE_DATA_DIR || path.join(process.env.HOME || "~", ".claude"),
  anthropicAdminApiKey: process.env.ANTHROPIC_ADMIN_API_KEY || "",
  dataSourceMode: (process.env.DATA_SOURCE_MODE || "local") as "local" | "api",
  cacheTtlMs: 60_000,
};
