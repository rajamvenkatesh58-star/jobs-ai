import { api } from "./client";

export interface JobListing {
  id: string;
  seek_job_id: string;
  title: string;
  company: string | null;
  location: string | null;
  category: string | null;
  work_type: string | null;
  salary_range: string | null;
  description: string | null;
  listing_url: string;
  published_at: string | null;
  ingested_at: string;
  my_score: number | null;
  my_score_reasoning: string | null;
}

export interface IngestResponse {
  new_jobs_found: number;
  total_fetched: number;
  message: string;
}

export const jobsApi = {
  list: (minScore = 0) =>
    api.get<JobListing[]>("/jobs/", { params: { min_score: minScore } }).then((r) => r.data),

  get: (id: string) => api.get<JobListing>(`/jobs/${id}`).then((r) => r.data),

  ingest: () => api.post<IngestResponse>("/jobs/ingest").then((r) => r.data),
};
