import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "../api/client";
import type { Application, Job, JobQueueItem } from "../types";

export const JOB_KEYS = {
  all: ["jobs"] as const,
  list: (minScore = 0) => ["jobs", "list", minScore] as const,
  detail: (id: string) => ["jobs", id] as const,
};

export function useJobs(minScore = 0) {
  return useQuery({
    queryKey: JOB_KEYS.list(minScore),
    queryFn: () =>
      api.get<Job[]>(`/jobs/?min_score=${minScore}&limit=200`).then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: JOB_KEYS.detail(id),
    queryFn: () => api.get<Job>(`/jobs/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useJobQueue() {
  const { data: jobs, isLoading: jobsLoading, error: jobsError } = useJobs();
  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: () => api.get<Application[]>("/applications/").then((r) => r.data),
    staleTime: 30_000,
  });

  const items = useMemo<JobQueueItem[]>(() => {
    if (!jobs) return [];
    const appMap = new Map<string, Application>();
    (applications ?? []).forEach((a) => {
      // Keep most recent non-dismissed application per job
      if (a.status !== "dismissed") appMap.set(a.job_id, a);
    });
    return jobs
      .map((job) => {
        const application = appMap.get(job.id) ?? null;
        let uiState: JobQueueItem["uiState"] = "NEW";
        if (application) {
          if (application.status === "pending_review") uiState = "TAILORED";
          else if (application.status === "approved") uiState = "READY";
          else if (application.status === "submitted") uiState = "SENT";
        }
        return { ...job, application, uiState };
      })
      .filter((j) => j.uiState !== "NEW" || (j.my_score ?? 0) >= 70);
  }, [jobs, applications]);

  return { items, isLoading: jobsLoading || appsLoading, error: jobsError };
}

export function useIngestJobs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/jobs/ingest").then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: JOB_KEYS.all }),
  });
}

export function useGenerateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      api.post<Application>("/applications/generate", { job_id: jobId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: JOB_KEYS.all });
    },
  });
}
