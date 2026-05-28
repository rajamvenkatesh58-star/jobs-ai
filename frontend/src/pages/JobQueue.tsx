import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { jobsApi } from "../api/jobs";
import { JobCard } from "../components/JobCard";

export function JobQueue() {
  const [minScore, setMinScore] = useState(0);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs", minScore],
    queryFn: () => jobsApi.list(minScore),
  });

  const ingestMutation = useMutation({
    mutationFn: jobsApi.ingest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const generateMutation = useMutation({
    mutationFn: (jobId: string) =>
      api.post("/applications/generate", { job_id: jobId }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Queue</h1>
          <p className="mt-1 text-sm text-gray-500">{jobs.length} jobs found</p>
        </div>
        <button
          onClick={() => ingestMutation.mutate()}
          disabled={ingestMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
        >
          <RefreshCwIcon size={16} className={ingestMutation.isPending ? "animate-spin" : ""} />
          {ingestMutation.isPending ? "Ingesting…" : "Ingest from Seek"}
        </button>
      </div>

      {ingestMutation.isSuccess && (
        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          {(ingestMutation.data as { message: string }).message}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Min score:</label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="w-40"
        />
        <span className="text-sm font-semibold text-gray-700 w-8">{minScore}</span>
      </div>

      <div className="mt-6 space-y-4">
        {isLoading && (
          <p className="text-gray-400 text-sm">Loading…</p>
        )}
        {!isLoading && jobs.length === 0 && (
          <p className="text-gray-400 text-sm">
            No jobs match the current filter. Try lowering the min score or run an ingest.
          </p>
        )}
        {jobs
          .sort((a, b) => (b.my_score ?? 0) - (a.my_score ?? 0))
          .map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onGenerateDocs={() => generateMutation.mutate(job.id)}
              onStartInterview={() => navigate(`/interview?job_id=${job.id}`)}
            />
          ))}
      </div>
    </div>
  );
}
