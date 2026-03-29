import { Hono } from "hono";
import { getAllProjects, getProjectByName } from "../parsers/sessions-index.js";
import type { ProjectsResponse, ProjectStats, SessionListItem } from "../types.js";

const app = new Hono();

app.get("/", async (c) => {
	const projects = await getAllProjects();

	const projectStats: ProjectStats[] = projects
		.map((p) => {
			const nonSidechain = p.entries.filter((e) => !e.isSidechain);
			const branches = [...new Set(nonSidechain.map((e) => e.gitBranch).filter(Boolean))];
			const dates = nonSidechain
				.map((e) => e.created)
				.filter(Boolean)
				.sort();

			return {
				name: p.name,
				displayName: p.displayName,
				totalSessions: nonSidechain.length,
				totalMessages: nonSidechain.reduce((sum, e) => sum + e.messageCount, 0),
				branches,
				firstActive: dates[0] || "",
				lastActive: dates[dates.length - 1] || "",
			};
		})
		.filter((p) => p.totalSessions > 0)
		.sort((a, b) => b.totalSessions - a.totalSessions);

	const response: ProjectsResponse = { projects: projectStats };
	return c.json(response);
});

app.get("/:name/sessions", async (c) => {
	const name = c.req.param("name");
	const project = await getProjectByName(name);

	if (!project) {
		return c.json({ sessions: [], total: 0 });
	}

	const sessions: SessionListItem[] = project.entries
		.filter((e) => !e.isSidechain)
		.map((e) => ({
			sessionId: e.sessionId,
			project: project.name,
			projectDisplayName: project.displayName,
			gitBranch: e.gitBranch,
			messageCount: e.messageCount,
			created: e.created,
			modified: e.modified,
			firstPrompt: e.firstPrompt?.slice(0, 120) || "",
			isSidechain: e.isSidechain,
		}))
		.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

	return c.json({ sessions, total: sessions.length });
});

export default app;
