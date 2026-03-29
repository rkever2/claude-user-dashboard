import { NavLink } from "react-router-dom";
import { useHealth } from "@/hooks/use-queries";
import { SourceBadge } from "@/components/ui/source-badge";

const links = [
	{ to: "/", label: "Overview" },
	{ to: "/activity", label: "Activity" },
	{ to: "/projects", label: "Projects" },
	{ to: "/models", label: "Models" },
	{ to: "/sessions", label: "Sessions" },
	{ to: "/insights", label: "Insights" },
];

function formatStatsDate(dateStr: string): string {
	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) return dateStr;

	const hasTime = dateStr.includes("T");
	if (hasTime) {
		return date.toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	}
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function Nav() {
	const { data: health } = useHealth();

	return (
		<nav className="fixed left-0 top-0 bottom-0 w-60 border-r border-border bg-white dark:bg-[oklch(0.1_0_0)] flex flex-col">
			<div className="px-6 py-6">
				<h1 className="font-display text-lg font-bold tracking-tight">Claude Code</h1>
				<p className="text-xs text-muted mt-0.5">Usage Dashboard</p>
			</div>

			<div className="flex-1 px-3">
				{links.map((link) => (
					<NavLink
						key={link.to}
						to={link.to}
						end={link.to === "/"}
						className={({ isActive }) =>
							`block px-3 py-2 text-sm transition-colors ${
								isActive
									? "border-l-2 border-brand text-brand font-medium"
									: "border-l-2 border-transparent text-muted-light hover:text-[oklch(0.14_0_0)] dark:hover:text-[oklch(0.92_0_0)]"
							}`
						}
					>
						{link.label}
					</NavLink>
				))}
			</div>

			{health && (
				<div className="px-6 py-4 border-t border-border">
					<div className="flex items-center gap-1.5">
						<p className="text-[10px] uppercase tracking-[0.05em] text-muted font-medium">Stats as of</p>
						<SourceBadge source={health.apiConfigured ? "api" : "local"} />
					</div>
					{health.lastDataDate && (
						<p className="text-xs text-muted-light mt-0.5">{formatStatsDate(health.lastDataDate)}</p>
					)}
				</div>
			)}
		</nav>
	);
}
