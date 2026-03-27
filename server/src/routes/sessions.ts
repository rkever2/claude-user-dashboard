import { Hono } from "hono";
import { getAllProjects } from "../parsers/sessions-index.js";
import { parseSessionJsonl } from "../parsers/session-jsonl.js";
import type { SessionListItem, SessionsResponse } from "../types.js";

const app = new Hono();

app.get("/", async (c) => {
  const projects = await getAllProjects();

  const sessions: SessionListItem[] = [];

  for (const project of projects) {
    for (const entry of project.entries) {
      if (entry.isSidechain) continue;

      sessions.push({
        sessionId: entry.sessionId,
        project: project.name,
        projectDisplayName: project.displayName,
        gitBranch: entry.gitBranch,
        messageCount: entry.messageCount,
        created: entry.created,
        modified: entry.modified,
        firstPrompt: entry.firstPrompt?.slice(0, 120) || "",
        isSidechain: entry.isSidechain,
      });
    }
  }

  sessions.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  const response: SessionsResponse = { sessions, total: sessions.length };
  return c.json(response);
});

app.get("/:id", async (c) => {
  const sessionId = c.req.param("id");
  const projects = await getAllProjects();

  // Find the session file path
  for (const project of projects) {
    const entry = project.entries.find((e) => e.sessionId === sessionId);
    if (entry?.fullPath) {
      try {
        const detail = await parseSessionJsonl(entry.fullPath);
        return c.json({
          ...detail,
          project: project.displayName,
          gitBranch: entry.gitBranch,
        });
      } catch {
        return c.json({ error: "Failed to parse session" }, 500);
      }
    }
  }

  return c.json({ error: "Session not found" }, 404);
});

export default app;
