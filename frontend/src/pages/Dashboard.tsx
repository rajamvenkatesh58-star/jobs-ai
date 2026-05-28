import { useQuery } from "@tanstack/react-query";
import { BriefcaseIcon, CheckCircleIcon, MicIcon, TrendingUpIcon } from "lucide-react";
import { api } from "../api/client";
import { jobsApi } from "../api/jobs";

interface Stats {
  total_jobs: number;
  high_score_jobs: number;
  pending_applications: number;
  completed_interviews: number;
}

function StatCard({ icon: Icon, label, value, colour }: {
  icon: typeof BriefcaseIcon;
  label: string;
  value: number;
  colour: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colour}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobsApi.list(),
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: () => api.get("/applications/").then((r) => r.data),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get("/interview/sessions").then((r) => r.data),
  });

  const highScore = jobs.filter((j) => (j.my_score ?? 0) >= 70).length;
  const pending = (applications as { status: string }[]).filter(
    (a) => a.status === "pending_review"
  ).length;
  const completed = (sessions as { status: string }[]).filter(
    (s) => s.status === "debrief_ready"
  ).length;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-gray-500">Your Jobs AI overview</p>

      <div className="mt-6 grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={BriefcaseIcon}
          label="Jobs Monitored"
          value={jobs.length}
          colour="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={TrendingUpIcon}
          label="High-Match Jobs (≥70)"
          value={highScore}
          colour="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={CheckCircleIcon}
          label="Pending Review"
          value={pending}
          colour="bg-yellow-50 text-yellow-600"
        />
        <StatCard
          icon={MicIcon}
          label="Sessions Complete"
          value={completed}
          colour="bg-purple-50 text-purple-600"
        />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Top Matching Jobs</h2>
        {jobs.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No jobs yet. Head to the Job Queue and click "Ingest from Seek" to get started.
          </p>
        ) : (
          <ul className="space-y-2">
            {jobs
              .filter((j) => j.my_score !== null)
              .sort((a, b) => (b.my_score ?? 0) - (a.my_score ?? 0))
              .slice(0, 5)
              .map((job) => (
                <li
                  key={job.id}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{job.title}</p>
                    <p className="text-xs text-gray-500">{job.company ?? "—"} · {job.location ?? "—"}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{job.my_score}</span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
