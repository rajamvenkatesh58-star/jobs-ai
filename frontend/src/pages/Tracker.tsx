import { useState } from "react";
import clsx from "clsx";
import { XIcon, CalendarIcon, ClockIcon, ChevronRightIcon, SendIcon, EyeIcon, MicIcon, TrophyIcon, ArchiveIcon, AlertCircleIcon } from "lucide-react";
import { useApplications, useUpdateApplicationStatus } from "../hooks/useApplications";
import { useJobs } from "../hooks/useJobs";
import { useToast } from "../components/Toast";
import { KanbanSkeleton } from "../components/Skeleton";
import type { Application, Job } from "../types";
import { formatDistanceToNow } from "../utils/time";

type Stage = "applied" | "approved" | "interview_scheduled" | "interview_done" | "offer" | "closed";

const COLUMNS: { id: Stage; label: string; icon: React.ElementType; color: string; appStatuses: Application["status"][] }[] = [
  { id: "applied", label: "Applied", icon: SendIcon, color: "rgb(var(--accent))", appStatuses: ["submitted"] },
  { id: "approved", label: "Approved / Ready", icon: EyeIcon, color: "rgb(var(--accent2))", appStatuses: ["approved"] },
  { id: "interview_scheduled", label: "Interview Scheduled", icon: CalendarIcon, color: "#D97706", appStatuses: [] },
  { id: "interview_done", label: "Interview Done", icon: MicIcon, color: "#7C3AED", appStatuses: [] },
  { id: "offer", label: "Offer Received", icon: TrophyIcon, color: "#059669", appStatuses: [] },
  { id: "closed", label: "Closed", icon: ArchiveIcon, color: "rgb(var(--ink-500))", appStatuses: ["dismissed"] },
];

interface AppCard {
  application: Application;
  job: Job | undefined;
}

function DetailPanel({ card, onClose }: { card: AppCard; onClose: () => void }) {
  const updateStatus = useUpdateApplicationStatus();
  const { toast } = useToast();

  const advance = async () => {
    const next = card.application.status === "submitted" ? "approved" : "submitted";
    try {
      await updateStatus.mutateAsync({ id: card.application.id, status: next });
      toast("Stage updated", "success");
      onClose();
    } catch { toast("Failed to update stage"); }
  };

  const dismiss = async () => {
    try {
      await updateStatus.mutateAsync({ id: card.application.id, status: "dismissed" });
      toast("Application archived", "success");
      onClose();
    } catch { toast("Failed to archive"); }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[420px] glass-strong h-full overflow-y-auto scrollbar-thin shadow-glass flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b hairline sticky top-0 glass-strong z-10">
          <div>
            <div className="font-bold text-ink-100 text-sm">{card.job?.title ?? "Unknown Role"}</div>
            <div className="text-xs text-ink-400">{card.job?.company ?? "Unknown"} · Applied {formatDistanceToNow(card.application.created_at)}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-800/30 text-ink-400 hover:text-ink-200"><XIcon size={16} /></button>
        </div>

        <div className="p-6 space-y-5 flex-1">
          {/* Status */}
          <div className="glass rounded-xl p-3">
            <div className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider mb-1">Current Status</div>
            <div className="text-xs font-semibold text-ink-200 capitalize">{card.application.status.replace("_", " ")}</div>
          </div>

          {/* Timeline */}
          <div>
            <div className="text-xs font-semibold text-ink-300 mb-3">Application Timeline</div>
            <div className="space-y-3">
              {[
                { label: "Application Created", date: card.application.created_at, done: true },
                { label: "Reviewed / Approved", date: card.application.reviewed_at, done: !!card.application.reviewed_at },
                { label: "Submitted to Seek", date: card.application.submitted_at, done: !!card.application.submitted_at },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={clsx("w-2.5 h-2.5 rounded-full shrink-0", step.done ? "bg-mint" : "bg-ink-700")} />
                  <span className={clsx("text-xs flex-1", step.done ? "text-ink-200 font-medium" : "text-ink-500")}>{step.label}</span>
                  {step.date && <span className="text-[10px] text-ink-500 mono">{formatDistanceToNow(step.date)}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Match score */}
          {card.application.match_score !== null && (
            <div className="glass rounded-xl p-3">
              <div className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider mb-1">Match Score</div>
              <div className="num text-lg font-bold" style={{ color: card.application.match_score >= 80 ? "#059669" : card.application.match_score >= 65 ? "#D97706" : "#E11D48" }}>
                {card.application.match_score}%
              </div>
              {card.application.score_reasoning && (
                <p className="text-[11px] text-ink-500 mt-1 leading-relaxed">{card.application.score_reasoning}</p>
              )}
            </div>
          )}

          {/* Days active */}
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <ClockIcon size={12} />
            <span>{Math.floor((Date.now() - new Date(card.application.created_at).getTime()) / 86400000)} days since created</span>
          </div>
        </div>

        <div className="px-6 py-4 border-t hairline sticky bottom-0 glass-strong space-y-2">
          {card.application.status !== "submitted" && card.application.status !== "dismissed" && (
            <button onClick={advance} disabled={updateStatus.isPending}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "rgb(var(--accent))" }}>
              <ChevronRightIcon size={15} />Advance Stage
            </button>
          )}
          {card.application.status !== "dismissed" && (
            <button onClick={dismiss} disabled={updateStatus.isPending}
              className="w-full py-2 rounded-xl text-xs font-medium text-ink-500 hover:text-ink-300 transition-colors">
              Archive application
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Tracker() {
  const [selected, setSelected] = useState<AppCard | null>(null);
  const { data: applications, isLoading: appsLoading, error } = useApplications();
  const { data: jobs, isLoading: jobsLoading } = useJobs();
  const isLoading = appsLoading || jobsLoading;

  const jobMap = new Map<string, Job>((jobs ?? []).map((j) => [j.id, j]));

  const metrics = {
    total_active: (applications ?? []).filter((a) => a.status !== "dismissed").length,
    submitted: (applications ?? []).filter((a) => a.status === "submitted").length,
    approved: (applications ?? []).filter((a) => a.status === "approved").length,
    dismissed: (applications ?? []).filter((a) => a.status === "dismissed").length,
  };

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircleIcon size={32} className="text-coral mx-auto mb-2" />
          <p className="text-sm text-ink-300">Failed to load applications</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Applications", value: metrics.total_active },
          { label: "Submitted to Seek", value: metrics.submitted },
          { label: "Approved / Ready", value: metrics.approved },
          { label: "Archived", value: metrics.dismissed },
        ].map((m) => (
          <div key={m.label} className="glass rounded-2xl shadow-glass p-4">
            <div className="num text-2xl font-bold text-ink-100">{m.value}</div>
            <div className="text-xs text-ink-400 mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <KanbanSkeleton />
      ) : (applications ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <SendIcon size={40} className="text-ink-700 mb-3" />
          <p className="text-sm font-semibold text-ink-300">No applications yet</p>
          <p className="text-xs text-ink-500 mt-1 max-w-xs">
            Generate applications from the Job Queue to see them tracked here
          </p>
          <a href="/jobs" className="mt-4 text-xs font-semibold px-4 py-2 rounded-xl text-white"
            style={{ background: "rgb(var(--accent))" }}>
            Go to Job Queue
          </a>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-4">
          {COLUMNS.map((col) => {
            const colApps: AppCard[] = (applications ?? [])
              .filter((a) => col.appStatuses.includes(a.status))
              .map((a) => ({ application: a, job: jobMap.get(a.job_id) }));

            const Icon = col.icon;
            return (
              <div key={col.id} className="flex-shrink-0 w-56">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Icon size={13} style={{ color: col.color }} />
                  <span className="text-xs font-semibold text-ink-300">{col.label}</span>
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: col.color }}>
                    {colApps.length}
                  </span>
                </div>
                <div className="space-y-2.5 min-h-16">
                  {colApps.length === 0 ? (
                    <div className="glass rounded-xl p-4 flex items-center justify-center h-16">
                      <span className="text-[10px] text-ink-600">Empty</span>
                    </div>
                  ) : (
                    colApps.map((card) => (
                      <div key={card.application.id} onClick={() => setSelected(card)}
                        className="glass rounded-xl shadow-glass p-3.5 cursor-pointer hover:shadow-glow transition-all">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold mb-2"
                          style={{ background: col.color }}>
                          {(card.job?.company ?? "??").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="text-xs font-semibold text-ink-100 leading-tight">
                          {card.job?.title ?? "Unknown Role"}
                        </div>
                        <div className="text-[10px] text-ink-400 mt-0.5">{card.job?.company ?? "Unknown"}</div>
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-ink-500">
                          <CalendarIcon size={9} />{formatDistanceToNow(card.application.created_at)}
                        </div>
                        {card.application.match_score !== null && (
                          <div className="mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded inline-block"
                            style={{ background: `${card.application.match_score >= 80 ? "#05966920" : "#D9770620"}`, color: card.application.match_score >= 80 ? "#059669" : "#D97706" }}>
                            {card.application.match_score}% match
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && <DetailPanel card={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
