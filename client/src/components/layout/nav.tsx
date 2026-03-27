import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Overview" },
  { to: "/activity", label: "Activity" },
  { to: "/projects", label: "Projects" },
  { to: "/models", label: "Models" },
  { to: "/sessions", label: "Sessions" },
  { to: "/insights", label: "Insights" },
];

export function Nav() {
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
      </div>

      <div className="px-6 py-4 border-t border-border">
        <p className="text-[10px] uppercase tracking-[0.05em] text-muted font-medium">
          Local data only
        </p>
      </div>
    </nav>
  );
}
