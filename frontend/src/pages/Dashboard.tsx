import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import {
  ScanIcon, StarIcon, SendIcon, CalendarIcon,
  BriefcaseIcon, FileTextIcon, MicIcon, ChevronRightIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import { useIngestJobs } from "../hooks/useJobs";
import { useToast } from "../components/Toast";
import { StatCardSkeleton, ChartSkeleton, ActivitySkeleton } from "../components/Skeleton";
import { formatDistanceToNow } from "../utils/time";

function scoreColor(s: number) {
  return s >= 80 ? "#059669" : s >= 65 ? "#D97706" : "#E11D48";
}

export function Dashboard() {
  const { stats, chartData, weeklyStats, activity, tickerJobs, isLoading } = useDashboard();
  const ingest = useIngestJobs();
  const { toast } = useToast();

  const handleIngest = async () => {
    try {
      const result = await ingest.mutateAsync(undefined as unknown as void);
      toast(`Ingested ${(result as { new_jobs_found: number }).new_jobs_found} new jobs`, "success");
    } catch {
      toast("Failed to ingest jobs — check your profile has seek keywords set");
    }
  };

  const accentRgb = "rgb(79,70,229)";
  const cyanRgb = "rgb(8,145,178)";
  const mintRgb = "#059669";
  const amberRgb = "#D97706";

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Live Ticker */}
      <div className="glass rounded-xl shadow-glass overflow-hidden">
        <div className="flex items-center">
          <div
            className="flex items-center gap-2 px-4 py-2.5 shrink-0 border-r hairline"
            style={{ background: "rgb(var(--accent) / 0.07)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
            <span className="text-[10px] font-bold text-ink-300 uppercase tracking-wider">Live</span>
          </div>
          <div className="flex-1 overflow-hidden py-2.5 px-4">
            {tickerJobs.length === 0 ? (
              <span className="text-xs text-ink-500">
                No matches yet — Scout is scanning, check back soon
              </span>
            ) : (
              <div className="ticker-track">
                {[...tickerJobs, ...tickerJobs].map((job, i) => (
                  <div key={i} className="flex items-center gap-2 mr-8 shrink-0">
                    <span
                      className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: `${scoreColor(job.my_score ?? 0)}20`,
                        color: scoreColor(job.my_score ?? 0),
                      }}
                    >
                      {job.my_score ?? "—"}%
                    </span>
                    <span className="text-xs text-ink-200 font-medium whitespace-nowrap">{job.title}</span>
                    <span className="text-ink-500">·</span>
                    <span className="text-xs text-ink-400 whitespace-nowrap">{job.company ?? "Unknown"}</span>
                    {job.location && (
                      <>
                        <span className="text-ink-500">·</span>
                        <span className="text-xs text-ink-500 whitespace-nowrap">{job.location}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            {[
              { icon: ScanIcon, label: "Jobs Scanned Today", value: stats.scannedToday.toString(), color: accentRgb },
              { icon: StarIcon, label: "High Matches ≥80%", value: stats.highMatches.toString(), color: mintRgb },
              { icon: SendIcon, label: "Applications Sent", value: `${stats.sent} / ${weeklyStats.target}`, color: cyanRgb },
              { icon: CalendarIcon, label: "Interview Sessions", value: stats.interviewSessions.toString(), color: amberRgb },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="glass rounded-2xl shadow-glass p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                    <Icon size={15} style={{ color }} />
                  </div>
                  <span className="text-[11px] text-ink-400 font-medium leading-tight">{label}</span>
                </div>
                <div className="num text-2xl font-bold text-ink-100">{value}</div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleIngest}
          disabled={ingest.isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-glow transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent-deep)))" }}
        >
          <RefreshCwIcon size={15} className={ingest.isPending ? "animate-spin" : ""} />
          {ingest.isPending ? "Scanning…" : "Ingest Jobs from Seek"}
        </button>
        <a
          href="/interview"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold glass shadow-glass text-ink-200 hover:text-ink-100 transition-all"
        >
          <MicIcon size={15} />
          Start Interview Prep
        </a>
        <a
          href="/profile"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-ink-400 hover:text-ink-200 hover:bg-white/30 transition-all"
        >
          <FileTextIcon size={15} />
          Update Profile
        </a>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="col-span-1 glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-semibold text-ink-200 mb-1">Listings scanned vs matched</div>
          <div className="text-[10px] text-ink-500 mb-4">Last 14 days</div>
          {isLoading ? (
            <ChartSkeleton />
          ) : chartData.every((d) => d.scanned === 0) ? (
            <div className="flex items-center justify-center h-36 text-xs text-ink-500">
              No job data yet — click "Ingest Jobs" to start
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gScanned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(var(--accent))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="rgb(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gMatched" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(15,23,42,0.08)", borderRadius: 8, fontSize: 11 }}
                  />
                  <Area type="monotone" dataKey="scanned" stroke="rgb(var(--accent))" strokeWidth={2} fill="url(#gScanned)" dot={false} name="Scanned" />
                  <Area type="monotone" dataKey="matched" stroke="#059669" strokeWidth={2} fill="url(#gMatched)" dot={false} name="Matched" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "rgb(var(--accent))" }} /><span className="text-[10px] text-ink-400">Scanned</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-mint" /><span className="text-[10px] text-ink-400">Matched</span></div>
              </div>
            </>
          )}
        </div>

        {/* Weekly targets */}
        <div className="col-span-1 glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-semibold text-ink-200 mb-1">Weekly target progress</div>
          <div className="text-[10px] text-ink-500 mb-4">Applications this week</div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 bg-ink-800 rounded animate-pulse w-1/2" />
                  <div className="h-1.5 bg-ink-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Tailored", value: weeklyStats.tailored, max: weeklyStats.target, color: "rgb(var(--accent))" },
                { label: "Approved", value: weeklyStats.approved, max: weeklyStats.target, color: "rgb(var(--accent2))" },
                { label: "Sent", value: weeklyStats.sent, max: weeklyStats.target, color: "#059669" },
              ].map(({ label, value, max, color }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-ink-300">{label}</span>
                    <span className="num text-[11px] font-semibold text-ink-200">
                      {value}<span className="text-ink-500">/{max}</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="col-span-1 glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-semibold text-ink-200 mb-4">Recent activity</div>
          {isLoading ? (
            <ActivitySkeleton />
          ) : activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BriefcaseIcon size={24} className="text-ink-600 mb-2" />
              <p className="text-xs text-ink-500">No activity yet</p>
              <p className="text-[10px] text-ink-600 mt-1">Ingest jobs to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((evt, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgb(var(--ink-800))" }}>
                    <BriefcaseIcon size={12} className="text-accent-soft" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-ink-200">{evt.label}</div>
                    <div className="text-[10px] text-ink-400 truncate">{evt.detail}</div>
                  </div>
                  <div className="text-[10px] text-ink-500 shrink-0 mono">{formatDistanceToNow(evt.time)}</div>
                </div>
              ))}
            </div>
          )}
          {activity.length > 0 && (
            <a href="/tracker" className="mt-4 w-full flex items-center justify-center gap-1 text-[11px] text-ink-400 hover:text-ink-200 transition-colors pt-3 border-t hairline">
              View all <ChevronRightIcon size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
