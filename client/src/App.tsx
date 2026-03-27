import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Shell } from "@/components/layout/shell";
import { OverviewPage } from "@/pages/overview";
import { ActivityPage } from "@/pages/activity";
import { ProjectsPage } from "@/pages/projects";
import { ModelsPage } from "@/pages/models";
import { SessionsPage } from "@/pages/sessions";
import { InsightsPage } from "@/pages/insights";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<OverviewPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="models" element={<ModelsPage />} />
              <Route path="sessions" element={<SessionsPage />} />
              <Route path="insights" element={<InsightsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
