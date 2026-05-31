import { useState } from "react";
import clsx from "clsx";
import {
  ExternalLinkIcon, ClipboardCopyIcon, CheckCircleIcon,
  MapPinIcon, DollarSignIcon, ClockIcon, XIcon, BadgeCheckIcon,
  AlertCircleIcon, ChevronRightIcon, BuildingIcon, RefreshCwIcon,
  PlusIcon,
} from "lucide-react";
import { useJobQueue, useGenerateApplication, useIngestJobs } from "../hooks/useJobs";
import { useUpdateApplicationStatus } from "../hooks/useApplications";
import { useToast } from "../components/Toast";
import { JobCardSkeleton } from "../components/Skeleton";
import type { JobQueueItem } from "../types";
import { formatDistanceToNow } from "../utils/time";

type UIState = "ALL" | "TAILORED" | "READY" | "SENT" | "NEW";

const STATE_CFG = {
  TAILORED: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  READY:    { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  SENT:     { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  NEW:      { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
};

function scoreColor(s: number) { return s >= 80 ? "#059669" : s >= 65 ? "#D97706" : "#E11D48"; }

function ScoreRing({ score }: { score: number | null }) {
  const s = score ?? 0;
  const r = 22, circ = 2 * Math.PI * r;
  const color = scoreColor(s);
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg width="56" height="56" className="ring-score">
        <circle cx="28" cy="28" r={r} strokeWidth="4" stroke="rgba(15,23,42,0.08)" fill="none" />
        <circle cx="28" cy="28" r={r} strokeWidth="4" stroke={color} fill="none"
          strokeDasharray={circ} strokeDashoffset={circ - (s / 100) * circ}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="num text-xs font-bold" style={{ color }}>{score !== null ? `${score}%` : "—"}</span>
      </div>
    </div>
  );
}

function Drawer({ item, onClose }: { item: JobQueueItem; onClose: () => void }) {
  const updateStatus = useUpdateApplicationStatus();
  const generate = useGenerateApplication();
  const { toast } = useToast();
  const cfg = STATE_CFG[item.uiState] ?? STATE_CFG.NEW;

  const approve = async () => {
    if (!item.application) return;
    try {
      await updateStatus.mutateAsync({ id: item.application.id, status: "approved" });
      toast("Marked as Ready — open on Seek when you're set", "success");
      onClose();
    } catch { toast("Failed to update status"); }
  };

  const markSent = async () => {
    if (!item.application) return;
    try {
      if (item.application.cover_letter_text) {
        await navigator.clipboard.writeText(item.application.cover_letter_text);
        toast("Cover letter copied to clipboard", "success");
      }
      await updateStatus.mutateAsync({ id: item.application.id, status: "submitted" });
      window.open(item.listing_url, "_blank");
      onClose();
    } catch { toast("Failed to update status"); }
  };

  const generateApp = async () => {
    try {
      await generate.mutateAsync(item.id);
      toast("Application generated — check back in a moment", "success");
      onClose();
    } catch { toast("Failed to generate application — ensure your profile is complete"); }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[480px] glass-strong h-full overflow-y-auto scrollbar-thin shadow-glass flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b hairline sticky top-0 glass-strong z-10">
          <div>
            <div className="font-bold text-ink-100 text-sm">{item.title}</div>
            <div className="text-xs text-ink-400">{item.company ?? "Unknown"} · {item.location ?? "AU"}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-800/30 text-ink-400 hover:text-ink-200">
            <XIcon size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5 flex-1">
          <div className="flex items-center gap-4">
            <ScoreRing score={item.my_score} />
            <div>
              <span className={clsx("text-[10px] font-bold px-2 py-1 rounded border tracking-wider", cfg.bg, cfg.text, cfg.border)}>
                {item.uiState}
              </span>
              <div className="text-xs text-ink-400 mt-1">{item.salary_range ?? "Salary not listed"} · {item.work_type ?? "Full-time"}</div>
            </div>
          </div>

          {/* Job description */}
          <div>
            <div className="text-xs font-semibold text-ink-300 mb-2">Job Description</div>
            <p className="text-xs text-ink-400 leading-relaxed whitespace-pre-line line-clamp-10">
              {item.description ?? "No description available."}
            </p>
            <a href={item.listing_url} target="_blank" rel="noreferrer"
              className="mt-2 flex items-center gap-1 text-[10px] text-accent-soft hover:underline">
              <ExternalLinkIcon size={10} /> View full listing on Seek
            </a>
          </div>

          {/* Score reasoning */}
          {item.my_score_reasoning && (
            <div>
              <div className="text-xs font-semibold text-ink-300 mb-2">Match Analysis</div>
              <p className="text-xs text-ink-400 leading-relaxed">{item.my_score_reasoning}</p>
            </div>
          )}

          {/* Tailored resume preview */}
          {item.application?.resume_text && (
            <div>
              <div className="text-xs font-semibold text-ink-300 mb-2">Tailored Resume Preview</div>
              <div className="glass rounded-xl p-4 text-[11px] text-ink-400 leading-relaxed max-h-40 overflow-y-auto scrollbar-thin whitespace-pre-line">
                {item.application.resume_text}
              </div>
            </div>
          )}

          {/* Cover letter preview */}
          {item.application?.cover_letter_text && (
            <div>
              <div className="text-xs font-semibold text-ink-300 mb-2">Cover Letter Preview</div>
              <div className="glass rounded-xl p-4 text-[11px] text-ink-400 leading-relaxed max-h-40 overflow-y-auto scrollbar-thin whitespace-pre-line">
                {item.application.cover_letter_text}
              </div>
            </div>
          )}

          {/* ATS keywords */}
          {item.my_score_reasoning && (
            <div>
              <div className="text-xs font-semibold text-ink-300 mb-2">Score Reasoning</div>
              <div className="flex flex-wrap gap-1.5">
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <BadgeCheckIcon size={10} />Match score: {item.my_score ?? "N/A"}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t hairline sticky bottom-0 glass-strong">
          {item.uiState === "NEW" && (
            <button onClick={generateApp} disabled={generate.isPending}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "rgb(var(--accent))" }}>
              <PlusIcon size={15} />{generate.isPending ? "Generating…" : "Generate Application"}
            </button>
          )}
          {item.uiState === "TAILORED" && (
            <button onClick={approve} disabled={updateStatus.isPending}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-100 border border-amber-300 flex items-center justify-center gap-2 hover:bg-amber-200 transition-colors disabled:opacity-60">
              <CheckCircleIcon size={15} />{updateStatus.isPending ? "Updating…" : "Approve & Mark Ready"}
            </button>
          )}
          {item.uiState === "READY" && (
            <div className="flex gap-2">
              <button onClick={markSent} disabled={updateStatus.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "rgb(var(--accent))" }}>
                <ExternalLinkIcon size={14} />{updateStatus.isPending ? "Updating…" : "Open on Seek"}
              </button>
              {item.application?.cover_letter_text && (
                <button
                  onClick={() => { navigator.clipboard.writeText(item.application!.cover_letter_text!); toast("Copied!", "success"); }}
                  className="px-4 py-2.5 rounded-xl glass text-ink-300 hover:text-ink-200">
                  <ClipboardCopyIcon size={14} />
                </button>
              )}
            </div>
          )}
          {item.uiState === "SENT" && (
            <a href="/tracker"
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors">
              <ChevronRightIcon size={15} />Track Application
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function JobQueue() {
  const [stateFilter, setStateFilter] = useState<UIState>("ALL");
  const [scoreFilter, setScoreFilter] = useState("All");
  const [selected, setSelected] = useState<JobQueueItem | null>(null);
  const { items, isLoading, error } = useJobQueue();
  const ingest = useIngestJobs();
  const { toast } = useToast();

  const filtered = items.filter((j) => {
    if (stateFilter !== "ALL" && j.uiState !== stateFilter) return false;
    if (scoreFilter === "80%" && (j.my_score ?? 0) < 80) return false;
    if (scoreFilter === "70%" && (j.my_score ?? 0) < 70) return false;
    return true;
  });

  const handleIngest = async () => {
    try {
      const r = await ingest.mutateAsync(undefined as unknown as void);
      toast(`Ingested ${(r as { new_jobs_found: number }).new_jobs_found} new jobs`, "success");
    } catch { toast("Failed to ingest — ensure your profile has seek keywords"); }
  };

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircleIcon size={32} className="text-coral mx-auto mb-2" />
          <p className="text-sm text-ink-300">Failed to load jobs</p>
          <p className="text-xs text-ink-500 mt-1">Check your connection and try again</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Filter bar */}
      <div className="glass rounded-2xl shadow-glass p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {(["ALL", "NEW", "TAILORED", "READY", "SENT"] as UIState[]).map((s) => (
            <button key={s} onClick={() => setStateFilter(s)}
              className={clsx("text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all",
                stateFilter === s ? "text-white shadow-glow" : "text-ink-400 hover:text-ink-200")}
              style={stateFilter === s ? { background: "rgb(var(--accent))" } : {}}>
              {s}
            </button>
          ))}
        </div>
        <div className="w-px h-5" style={{ background: "var(--hairline-c)" }} />
        <div className="flex items-center gap-1">
          {[{ l: "80%+", v: "80%" }, { l: "70%+", v: "70%" }, { l: "All scores", v: "All" }].map(({ l, v }) => (
            <button key={v} onClick={() => setScoreFilter(v)}
              className={clsx("text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all",
                scoreFilter === v ? "text-white" : "text-ink-400 hover:text-ink-200")}
              style={scoreFilter === v ? { background: "rgb(var(--accent2))" } : {}}>{l}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] text-ink-400 num">{filtered.length} jobs</span>
          <button onClick={handleIngest} disabled={ingest.isPending}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-60"
            style={{ background: "rgb(var(--accent))" }}>
            <RefreshCwIcon size={11} className={ingest.isPending ? "animate-spin" : ""} />
            {ingest.isPending ? "Scanning…" : "Ingest Jobs"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <JobCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BriefcaseIcon size={40} className="text-ink-700 mb-3" />
          <p className="text-sm font-semibold text-ink-300">No jobs in queue</p>
          <p className="text-xs text-ink-500 mt-1 max-w-xs">
            {items.length === 0
              ? 'Click "Ingest Jobs" to pull live listings from Seek based on your profile'
              : "Adjust filters to see more results"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((item) => {
            const cfg = STATE_CFG[item.uiState] ?? STATE_CFG.NEW;
            return (
              <div key={item.id} onClick={() => setSelected(item)}
                className="glass rounded-2xl shadow-glass p-5 cursor-pointer hover:shadow-glow transition-all group flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))" }}>
                    {(item.company ?? "??").slice(0, 2).toUpperCase()}
                  </div>
                  <span className={clsx("text-[9px] font-bold px-2 py-1 rounded border tracking-wider", cfg.bg, cfg.text, cfg.border)}>
                    {item.uiState}
                  </span>
                </div>

                <div>
                  <div className="font-bold text-sm text-ink-100 leading-tight">{item.title}</div>
                  <div className="flex items-center gap-1 mt-1 text-[11px] text-ink-400">
                    <BuildingIcon size={11} />{item.company ?? "Unknown"}
                    {item.location && <><span className="text-ink-600 mx-0.5">·</span><MapPinIcon size={11} />{item.location}</>}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <ScoreRing score={item.my_score} />
                  <div className="text-right">
                    {item.salary_range && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-ink-200 justify-end">
                        <DollarSignIcon size={11} className="text-mint" />{item.salary_range}
                      </div>
                    )}
                    {item.published_at && (
                      <div className="flex items-center gap-1 text-[10px] text-ink-500 mt-0.5 justify-end">
                        <ClockIcon size={10} />{formatDistanceToNow(item.published_at)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t hairline">
                  {item.uiState === "NEW" && (
                    <button className="w-full py-2 rounded-lg text-xs font-semibold transition-colors" style={{ background: "rgb(var(--accent) / 0.1)", color: "rgb(var(--accent))" }}>
                      Generate Application
                    </button>
                  )}
                  {item.uiState === "TAILORED" && (
                    <button className="w-full py-2 rounded-lg text-xs font-semibold transition-colors bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100">
                      Review & Approve
                    </button>
                  )}
                  {item.uiState === "READY" && (
                    <div className="flex gap-2">
                      <button className="flex-1 py-2 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1"
                        style={{ background: "rgb(var(--accent))" }}>
                        <ExternalLinkIcon size={11} />Open on Seek
                      </button>
                      {item.application?.cover_letter_text && (
                        <button className="px-3 py-2 rounded-lg text-xs glass text-ink-400 hover:text-ink-200">
                          <ClipboardCopyIcon size={11} />
                        </button>
                      )}
                    </div>
                  )}
                  {item.uiState === "SENT" && (
                    <button className="w-full py-2 rounded-lg text-xs font-semibold transition-colors bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center gap-1">
                      <CheckCircleIcon size={11} />Track Application
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && <Drawer item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// Need this import for the empty state
function BriefcaseIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  );
}
