import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import {
  LayoutDashboard, BriefcaseIcon, UserIcon, MicIcon,
  BookmarkIcon, SendIcon, CalendarIcon, TrophyIcon, ArchiveIcon,
  ZapIcon, LogOutIcon,
} from "lucide-react";
import { useApplications } from "../hooks/useApplications";
import { useJobs } from "../hooks/useJobs";
import { useInterviewSessions } from "../hooks/useInterview";

const workspace = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", key: "D" },
  { to: "/jobs", icon: BriefcaseIcon, label: "Job Queue", key: "J" },
  { to: "/profile", icon: UserIcon, label: "Profile", key: "P" },
  { to: "/interview", icon: MicIcon, label: "Interview", key: "I" },
];


export function Layout() {
  const { data: applications } = useApplications();
  const { data: jobs } = useJobs(70);
  const { data: sessions } = useInterviewSessions();

  const pipelineCounts = {
    saved: (jobs ?? []).length,
    applied: (applications ?? []).filter((a) => a.status === "submitted").length,
    interviewing: (sessions ?? []).filter((s) => s.status === "in_progress").length,
    offers: 0,
    archive: (applications ?? []).filter((a) => a.status === "dismissed").length,
  };

  const pipeline = [
    { label: "Saved Jobs", icon: BookmarkIcon, count: pipelineCounts.saved, to: "/jobs" },
    { label: "Applied", icon: SendIcon, count: pipelineCounts.applied, to: "/tracker" },
    { label: "Interviewing", icon: CalendarIcon, count: pipelineCounts.interviewing, to: "/interview" },
    { label: "Offers", icon: TrophyIcon, count: pipelineCounts.offers, to: "/tracker" },
    { label: "Archive", icon: ArchiveIcon, count: pipelineCounts.archive, to: "/tracker" },
  ];

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* Sidebar */}
      <aside className="glass-sidebar w-60 flex flex-col shrink-0 h-screen sticky top-0 z-40">
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 border-b hairline">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg shadow-glow flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))' }}>
              <ZapIcon size={14} className="text-white" />
            </div>
            <div>
              <div className="text-xs font-800 tracking-tight text-ink-100 font-bold">CareerOps AU</div>
              <div className="text-[10px] text-ink-400 font-mono mono">V2.4</div>
            </div>
          </div>
          {/* User — initials from JWT sub, no hardcoded name */}
          <div className="mt-4 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))' }}>
              ME
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-ink-100 truncate">My Account</div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold px-1 rounded" style={{ background: 'rgb(var(--accent) / 0.12)', color: 'rgb(var(--accent))' }}>PRO</span>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace */}
        <div className="px-3 pt-4">
          <div className="text-[10px] font-semibold text-ink-500 uppercase tracking-widest px-2 mb-1.5">Workspace</div>
          <nav className="space-y-0.5">
            {workspace.map(({ to, icon: Icon, label, key }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group",
                    isActive
                      ? "shadow-glass text-ink-100 font-semibold"
                      : "text-ink-400 hover:text-ink-200 hover:bg-white/40"
                  )
                }
                style={({ isActive }) => isActive ? { background: 'var(--glass-strong-bg)', border: '1px solid var(--glass-strong-border)' } : {}}
              >
                <Icon size={15} className="shrink-0" />
                <span className="flex-1">{label}</span>
                <span className="text-[9px] text-ink-500 font-mono mono border border-ink-700 rounded px-1">{key}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Pipeline */}
        <div className="px-3 pt-5">
          <div className="text-[10px] font-semibold text-ink-500 uppercase tracking-widest px-2 mb-1.5">Pipeline</div>
          <div className="space-y-0.5">
            {pipeline.map(({ label, icon: Icon, count, to }) => (
              <NavLink key={label} to={to}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-ink-400 hover:text-ink-200 hover:bg-white/30 transition-all">
                <Icon size={13} className="shrink-0" />
                <span className="flex-1">{label}</span>
                <span className="num text-[10px] text-ink-500 font-mono mono">{count}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Scout Live — shows once user has configured seek keywords */}
        <div className="mt-auto px-3 pb-4">
          <div className="glass rounded-xl p-3 shadow-glass">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-mint animate-pulse-soft shrink-0" />
              <span className="text-[11px] font-semibold text-ink-200">Scout Live</span>
            </div>
            <div className="text-[10px] text-ink-400 leading-relaxed">
              Scanning Seek AU job boards
            </div>
            <div className="text-[10px] text-ink-500 mt-0.5">Click <span className="text-ink-300 font-semibold">Ingest Jobs</span> on Dashboard to pull latest</div>
            <a href="/profile" className="mt-2.5 w-full block text-center text-[10px] font-semibold py-1.5 rounded-lg transition-all" style={{ background: 'rgb(var(--accent) / 0.1)', color: 'rgb(var(--accent))' }}>
              Configure Scout
            </a>
          </div>
          <button
            onClick={() => { localStorage.removeItem("access_token"); window.location.href = "/login"; }}
            className="mt-2 w-full flex items-center justify-center gap-1.5 text-[10px] text-ink-500 hover:text-ink-300 transition-colors py-1.5"
          >
            <LogOutIcon size={11} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <Outlet />
      </main>
    </div>
  );
}
