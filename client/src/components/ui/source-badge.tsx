export function SourceBadge({ source }: { source?: "api" | "local" }) {
	const label = source || "local";

	return (
		<span
			className={`inline-block text-[9px] uppercase tracking-[0.04em] font-medium px-1 py-px leading-tight ${
				label === "api"
					? "text-blue-500/70 dark:text-blue-400/70 bg-blue-500/8 dark:bg-blue-400/8"
					: "text-muted/60 bg-[oklch(0.94_0_0)] dark:bg-[oklch(0.18_0_0)]"
			}`}
		>
			{label}
		</span>
	);
}
