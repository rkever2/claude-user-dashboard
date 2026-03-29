import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { ErrorAlert } from "@/components/ui/error-alert";
import { useSessions } from "@/hooks/use-queries";
import { formatNumber, formatDateFull } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { SessionListItem } from "@shared/types";

type SortKey = "messages" | "created";
type SortDir = "asc" | "desc";

export function SessionsPage() {
	const { data, isError, error, refetch } = useSessions();

	const [search, setSearch] = useState("");
	const [sortKey, setSortKey] = useState<SortKey>("created");
	const [sortDir, setSortDir] = useState<SortDir>("desc");
	const [projectFilter, setProjectFilter] = useState<string[]>([]);
	const [branchFilter, setBranchFilter] = useState<string[]>([]);

	const sessions = data?.sessions || [];

	// Derive unique values for filters
	const projectOptions = useMemo(() => [...new Set(sessions.map((s) => s.projectDisplayName))].sort(), [sessions]);
	const branchOptions = useMemo(
		() => [...new Set(sessions.map((s) => s.gitBranch).filter(Boolean))].sort(),
		[sessions],
	);

	// Filter pipeline: project → branch → search → sort
	const filtered = useMemo(() => {
		let result = sessions;

		// Project filter (empty = all)
		if (projectFilter.length > 0) {
			result = result.filter((s) => projectFilter.includes(s.projectDisplayName));
		}

		// Branch filter (empty = all)
		if (branchFilter.length > 0) {
			result = result.filter((s) => branchFilter.includes(s.gitBranch));
		}

		// Search (case-insensitive across project, branch, prompt)
		if (search) {
			const q = search.toLowerCase();
			result = result.filter(
				(s) =>
					s.projectDisplayName.toLowerCase().includes(q) ||
					s.gitBranch.toLowerCase().includes(q) ||
					s.firstPrompt.toLowerCase().includes(q),
			);
		}

		// Sort
		result = [...result].sort((a, b) => {
			let cmp = 0;
			if (sortKey === "messages") {
				cmp = a.messageCount - b.messageCount;
			} else {
				cmp = a.created.localeCompare(b.created);
			}
			return sortDir === "asc" ? cmp : -cmp;
		});

		return result;
	}, [sessions, projectFilter, branchFilter, search, sortKey, sortDir]);

	const isFiltered = search || projectFilter.length > 0 || branchFilter.length > 0;

	function handleSort(key: string) {
		if (key === sortKey) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key as SortKey);
			setSortDir(key === "messages" ? "desc" : "desc");
		}
	}

	return (
		<div>
			<Header title="Sessions" source="local" />
			<div className="p-8">
				{isError ? (
					<div className="mb-6">
						<ErrorAlert
							title="Failed to load sessions"
							message={error instanceof ApiError ? error.message : "Could not load session data"}
							onRetry={() => refetch()}
						/>
					</div>
				) : null}

				<div className="border border-border">
					{/* Toolbar */}
					<div className="px-6 pt-5 pb-3 flex items-center gap-4 flex-wrap">
						{/* Search */}
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search sessions..."
							className="px-3 py-1.5 text-xs border border-border bg-transparent text-inherit placeholder:text-muted focus:outline-none focus:border-brand w-56"
						/>

						{/* Filters */}
						<MultiSelectFilter
							label="Project"
							options={projectOptions}
							selected={projectFilter}
							onChange={setProjectFilter}
						/>
						<MultiSelectFilter
							label="Branch"
							options={branchOptions}
							selected={branchFilter}
							onChange={setBranchFilter}
						/>

						{/* Spacer + count */}
						<div className="ml-auto">
							<span className="text-xs text-muted">
								{isFiltered ? `${filtered.length} of ${sessions.length} sessions` : `${sessions.length} sessions`}
							</span>
						</div>
					</div>

					<DataTable
						columns={[
							{
								key: "project",
								header: "Project",
								render: (row: SessionListItem) => <span className="font-medium">{row.projectDisplayName}</span>,
							},
							{
								key: "branch",
								header: "Branch",
								render: (row) => <span className="text-xs font-mono text-muted">{row.gitBranch}</span>,
							},
							{
								key: "messages",
								header: "Messages",
								align: "right",
								sortable: true,
								render: (row) => formatNumber(row.messageCount),
							},
							{
								key: "created",
								header: "Created",
								align: "right",
								sortable: true,
								render: (row) => formatDateFull(row.created),
							},
							{
								key: "prompt",
								header: "First Prompt",
								render: (row) => (
									<span className="text-xs text-muted truncate max-w-[300px] block">{row.firstPrompt || "—"}</span>
								),
							},
						]}
						data={filtered}
						sortConfig={{ key: sortKey, direction: sortDir }}
						onSort={handleSort}
					/>
				</div>
			</div>
		</div>
	);
}
