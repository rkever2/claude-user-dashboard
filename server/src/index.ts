import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs/promises";
import path from "path";
import { config } from "./config.js";
import { AppError } from "./errors.js";

import overviewRoutes from "./routes/overview.js";
import activityRoutes from "./routes/activity.js";
import projectsRoutes from "./routes/projects.js";
import modelsRoutes from "./routes/models.js";
import sessionsRoutes from "./routes/sessions.js";
import costsRoutes from "./routes/costs.js";
import insightsRoutes from "./routes/insights.js";

const app = new Hono();

app.use("*", cors());

// Global error handler
app.onError((err, c) => {
	if (err instanceof AppError) {
		return c.json({ error: true, code: err.code, message: err.message }, err.statusCode as 400);
	}
	console.error("Unhandled error:", err);
	return c.json({ error: true, code: "INTERNAL_ERROR", message: "An unexpected error occurred" }, 500);
});

app.notFound((c) => c.json({ error: true, code: "NOT_FOUND", message: "Endpoint not found" }, 404));

// API routes
app.route("/api/overview", overviewRoutes);
app.route("/api/activity", activityRoutes);
app.route("/api/projects", projectsRoutes);
app.route("/api/models", modelsRoutes);
app.route("/api/sessions", sessionsRoutes);
app.route("/api/costs", costsRoutes);
app.route("/api/insights", insightsRoutes);

// Enhanced health endpoint
app.get("/api/health", async (c) => {
	const issues: string[] = [];
	let dataDirExists = false;
	let statsCacheExists = false;
	let projectsDirExists = false;
	let sessionCount: number | null = null;

	try {
		await fs.access(config.claudeDataDir);
		dataDirExists = true;
	} catch {
		issues.push(`Data directory not found: ${config.claudeDataDir}. Set CLAUDE_DATA_DIR in your .env file.`);
	}

	if (dataDirExists) {
		try {
			await fs.access(path.join(config.claudeDataDir, "stats-cache.json"));
			statsCacheExists = true;
		} catch {
			issues.push("stats-cache.json not found. Use Claude Code CLI to generate usage data.");
		}

		try {
			const projectsDir = path.join(config.claudeDataDir, "projects");
			await fs.access(projectsDir);
			projectsDirExists = true;
			const dirs = await fs.readdir(projectsDir);
			sessionCount = dirs.length;
		} catch {
			issues.push("projects/ directory not found. Session details will be unavailable.");
		}
	}

	const status = !dataDirExists ? "error" : issues.length > 0 ? "degraded" : "ok";

	// Get the latest data timestamp from stats cache for freshness indicator
	let lastDataDate: string | null = null;
	try {
		const { getStatsCache } = await import("./parsers/stats-cache.js");
		const stats = await getStatsCache();
		lastDataDate = stats.latestMessageTimestamp || null;
		// Fallback to last date in daily activity if no timestamp
		if (!lastDataDate && stats.dailyActivity.length > 0) {
			lastDataDate = stats.dailyActivity[stats.dailyActivity.length - 1].date;
		}
	} catch {
		// stats not available yet
	}

	return c.json({
		status,
		dataDir: config.claudeDataDir,
		dataDirExists,
		statsCacheExists,
		projectsDirExists,
		sessionCount,
		lastDataDate,
		issues,
	});
});

// Serve static client files in production
if (process.env.NODE_ENV === "production") {
	app.use("/*", serveStatic({ root: "./client/dist" }));

	// SPA fallback — serve index.html for any non-API, non-file route
	app.get("*", serveStatic({ root: "./client/dist", path: "index.html" }));
}

// Startup validation
async function validateAndStart() {
	console.log(`Claude Code Dashboard starting on port ${config.port}`);
	console.log(`Data directory: ${path.resolve(config.claudeDataDir)}`);

	try {
		const stat = await fs.stat(config.claudeDataDir);
		if (!stat.isDirectory()) {
			console.error(`ERROR: ${config.claudeDataDir} exists but is not a directory.`);
		} else {
			console.log("Data directory: found");
		}
	} catch {
		console.warn(`WARNING: Data directory not found at ${config.claudeDataDir}`);
		console.warn("  Set CLAUDE_DATA_DIR in .env or ensure ~/.claude exists.");
		console.warn("  The server will start, but data endpoints will return errors.");
	}

	const projectsDir = path.join(config.claudeDataDir, "projects");
	try {
		await fs.access(projectsDir);
		console.log("projects/ directory: found");
	} catch {
		console.warn("WARNING: projects/ directory not found. JSONL session scanning will be unavailable.");
	}

	serve({
		fetch: app.fetch,
		port: config.port,
	});

	console.log(`Dashboard ready at http://localhost:${config.port}`);
}

validateAndStart();
