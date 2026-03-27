import { NavLink } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const links = [
  { to: "/", label: "Overview" },
  { to: "/activity", label: "Activity" },
  { to: "/projects", label: "Projects" },
  { to: "/models", label: "Models" },
  { to: "/sessions", label: "Sessions" },
  { to: "/insights", label: "Insights" },
];

export function Nav() {
  const queryClient = useQueryClient();

  const { data: modeData } = useQuery({
    queryKey: ["mode"],
    queryFn: () => api.getMode(),
    staleTime: 30_000,
  });

  const modeMutation = useMutation({
    mutationFn: (mode: string) => api.setMode(mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mode"] });
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({ queryKey: ["costs"] });
    },
  });

  const currentMode = modeData?.mode || "local";
  const apiKeyConfigured = modeData?.apiKeyConfigured || false;

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-60 border-r border-border bg-white dark:bg-[oklch(0.1_0_0)] flex flex-col">
      <div className="px-6 py-6">
        <h1 className="font-display text-lg font-bold tracking-tight">
          Claude Code
        </h1>
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

        {/* Mode switcher */}
        <div className="mt-4 pt-4 border-t border-border px-3">
          <p className="text-[10px] uppercase tracking-[0.05em] text-muted font-medium mb-2">
            Data source
          </p>
          {apiKeyConfigured ? (
            <select
              value={currentMode}
              onChange={(e) => modeMutation.mutate(e.target.value)}
              disabled={modeMutation.isPending}
              className="w-full px-2 py-1.5 text-xs border border-border bg-transparent text-inherit cursor-pointer focus:outline-none focus:border-brand disabled:opacity-50"
            >
              <option value="local">Local only</option>
              <option value="api">API mode</option>
            </select>
          ) : (
            <p className="text-xs text-muted">Local mode only</p>
          )}
        </div>
      </div>
    </nav>
  );
}
