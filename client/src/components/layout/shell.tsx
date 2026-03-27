import { Outlet } from "react-router-dom";
import { Nav } from "./nav";
import { StatusBanner } from "./status-banner";

export function Shell() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="ml-60">
        <StatusBanner />
        <Outlet />
      </main>
    </div>
  );
}
