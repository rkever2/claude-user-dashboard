import { useEffect, useState } from "react";
import { SourceBadge } from "@/components/ui/source-badge";

export function Header({ title, source }: { title: string; source?: "api" | "local" }) {
	const [dark, setDark] = useState(() => {
		if (typeof window !== "undefined") {
			return localStorage.getItem("theme") === "dark";
		}
		return false;
	});

	useEffect(() => {
		document.documentElement.classList.toggle("dark", dark);
		localStorage.setItem("theme", dark ? "dark" : "light");
	}, [dark]);

	return (
		<header className="flex items-center justify-between border-b border-border px-8 py-4">
			<div className="flex items-center gap-2">
				<h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
				<SourceBadge source={source} />
			</div>
			<button
				onClick={() => setDark(!dark)}
				className="px-3 py-1.5 text-xs font-medium border border-border hover:bg-surface transition-colors"
			>
				{dark ? "Light" : "Dark"}
			</button>
		</header>
	);
}
