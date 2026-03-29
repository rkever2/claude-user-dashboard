import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
	OverviewResponse,
	ActivityResponse,
	ProjectsResponse,
	ModelsResponse,
	SessionsResponse,
	CostsResponse,
	InsightsResponse,
} from "@shared/types";

export interface HealthResponse {
	status: "ok" | "degraded" | "error";
	dataDir: string;
	dataDirExists: boolean;
	statsCacheExists: boolean;
	projectsDirExists: boolean;
	sessionCount: number | null;
	lastDataDate?: string | null;
	issues: string[];
}

export function useHealth() {
	return useQuery<HealthResponse>({
		queryKey: ["health"],
		queryFn: () => api.getHealth() as Promise<HealthResponse>,
		staleTime: 30_000,
		retry: false,
	});
}

export function useOverview() {
	return useQuery<OverviewResponse>({
		queryKey: ["overview"],
		queryFn: () => api.getOverview() as Promise<OverviewResponse>,
		staleTime: 60_000,
	});
}

export function useActivity(range: string) {
	return useQuery<ActivityResponse>({
		queryKey: ["activity", range],
		queryFn: () => api.getActivity(range) as Promise<ActivityResponse>,
		staleTime: 60_000,
	});
}

export function useProjects() {
	return useQuery<ProjectsResponse>({
		queryKey: ["projects"],
		queryFn: () => api.getProjects() as Promise<ProjectsResponse>,
		staleTime: 60_000,
	});
}

export function useModels() {
	return useQuery<ModelsResponse>({
		queryKey: ["models"],
		queryFn: () => api.getModels() as Promise<ModelsResponse>,
		staleTime: 60_000,
	});
}

export function useSessions() {
	return useQuery<SessionsResponse>({
		queryKey: ["sessions"],
		queryFn: () => api.getSessions() as Promise<SessionsResponse>,
		staleTime: 60_000,
	});
}

export function useCosts(range: string) {
	return useQuery<CostsResponse>({
		queryKey: ["costs", range],
		queryFn: () => api.getCosts(range) as Promise<CostsResponse>,
		staleTime: 60_000,
	});
}

export function useInsights() {
	return useQuery<InsightsResponse>({
		queryKey: ["insights"],
		queryFn: () => api.getInsights() as Promise<InsightsResponse>,
		staleTime: 60_000,
	});
}
