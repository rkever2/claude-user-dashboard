import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";
import type { SessionsIndex, SessionEntry } from "../types.js";

interface ProjectData {
  name: string;
  displayName: string;
  entries: SessionEntry[];
  originalPath: string;
}

let cache: { data: ProjectData[]; timestamp: number } | null = null;

function dirNameToPath(dirName: string): string {
  return dirName.replace(/^-/, "/").replace(/-/g, "/");
}

function extractDisplayName(dirName: string): string {
  // Strip worktree suffix if present
  const base = dirName.replace(/--claude-worktrees-.*$/, "");
  // Get last 2 segments for uniqueness (e.g. "root/platform-frontend" vs "github/platform-frontend")
  const parts = base.split("-").filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const secondLast = parts[parts.length - 2];
    // If second-to-last looks like an org/parent (root, github, etc), include it
    return `${secondLast}/${last}`;
  }
  return parts[parts.length - 1] || dirName;
}

function isWorktreeDir(dirName: string): boolean {
  return dirName.includes("--claude-worktrees-");
}

function getParentDirName(dirName: string): string {
  return dirName.replace(/--claude-worktrees-.*$/, "");
}

export async function getAllProjects(): Promise<ProjectData[]> {
  const now = Date.now();
  if (cache && now - cache.timestamp < config.cacheTtlMs) {
    return cache.data;
  }

  const projectsDir = path.join(config.claudeDataDir, "projects");
  let dirs: string[];
  try {
    dirs = await fs.readdir(projectsDir);
  } catch {
    return [];
  }

  const projectMap = new Map<string, ProjectData>();

  for (const dir of dirs) {
    const indexPath = path.join(projectsDir, dir, "sessions-index.json");
    let index: SessionsIndex;
    try {
      const raw = await fs.readFile(indexPath, "utf-8");
      index = JSON.parse(raw);
    } catch {
      continue;
    }

    const baseName = isWorktreeDir(dir) ? getParentDirName(dir) : dir;

    if (!projectMap.has(baseName)) {
      projectMap.set(baseName, {
        name: baseName,
        displayName: extractDisplayName(baseName),
        entries: [],
        originalPath: index.originalPath || dirNameToPath(baseName),
      });
    }

    const project = projectMap.get(baseName)!;
    project.entries.push(...index.entries);
  }

  const data = Array.from(projectMap.values());
  cache = { data, timestamp: now };
  return data;
}

export async function getProjectByName(name: string): Promise<ProjectData | undefined> {
  const projects = await getAllProjects();
  return projects.find((p) => p.displayName === name || p.name === name);
}
