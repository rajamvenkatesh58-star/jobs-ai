import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import {
  ScanIcon, StarIcon, SendIcon, CalendarIcon,
  BriefcaseIcon, FileTextIcon, MicIcon, EyeIcon, ChevronRightIcon,
} from "lucide-react";

const sparkData = [4,6,5,8,7,9,11,10,12,14,13,15,16,14].map((v, i) => ({ v, i }));
const matchData = [12,18,15,22,20,28,24,30,26,32,35,38].map((v, i) => ({ v, i }));
const appData = [1,2,1,3,2,3,4,3,4,5,4,5,6,9].map((v, i) => ({ v, i }));

const areaChartData = Array.from({ length: 14 }, (_, i) => ({
  day: `${i + 1}`,
  scanned: Math.floor(80 + Math.random() * 40),
  matched: Math.floor(5 + Math.random() * 15),
}));

const tickerItems = [
  { score: 94, title: "Senior Data Engineer", company: "Telstra", location: "Sydney" },
  { score: 91, title: "Data Platform Lead", company: "ANZ Bank", location: "Melbourne" },
  { score: 88, title: "ML Engineer", company: "Atlassian", location: "Remote AU" },
  { score: 85, title: "Data Engineer", company: "Canva", location: "Sydney" },
  { score: 82, title: "Analytics Engineer", company: "Afterpay", location: "Melbourne" },
  { score: 79, title: "Data Infrastructure Lead", company: "Commonwealth Bank", location: "Sydney" },
];

const activity = [
  { icon: StarIcon, color: "text-mint", label: "New 94% match", detail: "Senior Data Engineer · Telstra", time: "2m ago" },
  { icon: FileTextIcon, color: "text-accent", label: "Resume tailored", detail: "Staff Product Designer · Canva", time: "14m ago" },
  { icon: CalendarIcon, color: "text-cyan-500", label: "Interview scheduled", detail: "Data Lead · ANZ Bank", time: "1h ago" },
  { icon: EyeIcon, color: "text-amber-500", label: "Application viewed", detail: "ML Engineer · Atlassian", time: "3h ago" },
];

function ScoreColor(s: number) {
  return s >= 80 ? "#059669" : s >= 65 ? "#D97706" : "#E11D48";
}

function Sparkline({ data, color }: { data: typeof sparkData; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`g${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#g${color})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Dashboard() {
  const accentRgb = "rgb(79,70,229)";
  const cyanRgb = "rgb(8,145,178)";
  const mintRgb = "#059669";
  const amberRgb = "#D97706";

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
      {/* Live Ticker */}
      <div className="glass rounded-xl shadow-glass overflow-hidden">
        <div className="flex items-center">
          <div className="flex items-center gap-2 px-4 py-2.5 shrink-0 border-r hairline" style={{ background: 'rgb(var(--accent) / 0.07)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
            <span className="text-[10px] font-bold text-ink-300 uppercase tracking-wider">Live</span>
          </div>
          <div className="flex-1 overflow-hidden py-2.5 px-4">
            <div className="ticker-track">
              {[...tickerItems, ...tickerItems].map((item, i) => (
                <div key={i} className="flex items-center gap-2 mr-8 shrink-0">
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${ScoreColor(item.score)}20`, color: ScoreColor(item.score) }}>
                    {item.score}%
                  </span>
                  <span className="text-xs text-ink-200 font-medium whitespace-nowrap">{item.title}</span>
                  <span className="text-ink-500">·</span>
                  <span className="text-xs text-ink-400 whitespace-nowrap">{item.company}</span>
                  <span className="text-ink-500">·</span>
                  <span className="text-xs text-ink-500 whitespace-nowrap">{item.location}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: ScanIcon, label: "Jobs Scanned Today", value: "1,487", change: "+12.4%", pos: true, data: sparkData, color: accentRgb },
          { icon: StarIcon, label: "High Matches ≥80%", value: "38", change: "+6 vs 24h avg", pos: true, data: matchData, color: mintRgb },
          { icon: SendIcon, label: "Applications Sent", value: "9 / 15", change: "60% of goal", pos: true, data: appData, color: cyanRgb },
          { icon: CalendarIcon, label: "Interviews Scheduled", value: "3", change: "Next: Wed 3 Jun 3:30pm", pos: true, data: sparkData.slice(0, 8), color: amberRgb },
        ].map(({ icon: Icon, label, value, change, data, color }) => (
          <div key={label} className="glass rounded-2xl shadow-glass p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <span className="text-[11px] text-ink-400 font-medium leading-tight">{label}</span>
              </div>
            </div>
            <div className="num text-2xl font-bold text-ink-100">{value}</div>
            <Sparkline data={data} color={color} />
            <div className="text-[10px] font-medium" style={{ color }}>{change}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-glow transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent-deep)))' }}>
          <BriefcaseIcon size={15} />
          Review Queue
          <span className="ml-1 text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">12</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold glass shadow-glass text-ink-200 hover:text-ink-100 transition-all">
          <MicIcon size={15} />
          Start Interview Prep
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-ink-400 hover:text-ink-200 hover:bg-white/30 transition-all rounded-xl">
          <FileTextIcon size={15} />
          Update Profile
        </button>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="col-span-1 glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-semibold text-ink-200 mb-1">Listings scanned vs matched</div>
          <div className="text-[10px] text-ink-500 mb-4">Last 14 days</div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={areaChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
                contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: 'rgb(var(--ink-300))' }}
              />
              <Area type="monotone" dataKey="scanned" stroke="rgb(var(--accent))" strokeWidth={2} fill="url(#gScanned)" dot={false} name="Scanned" />
              <Area type="monotone" dataKey="matched" stroke="#059669" strokeWidth={2} fill="url(#gMatched)" dot={false} name="Matched" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: 'rgb(var(--accent))' }} /><span className="text-[10px] text-ink-400">Scanned</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-mint" /><span className="text-[10px] text-ink-400">Matched</span></div>
          </div>
        </div>

        {/* Weekly targets */}
        <div className="col-span-1 glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-semibold text-ink-200 mb-1">Weekly target progress</div>
          <div className="text-[10px] text-ink-500 mb-4">Applications this week</div>
          <div className="space-y-3">
            {[
              { label: "Tailored", value: 9, max: 15, color: "rgb(var(--accent))" },
              { label: "Drafted", value: 4, max: 15, color: "rgb(var(--accent2))" },
              { label: "Sent", value: 9, max: 15, color: "#059669" },
            ].map(({ label, value, max, color }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] text-ink-300">{label}</span>
                  <span className="num text-[11px] font-semibold text-ink-200">{value}<span className="text-ink-500">/{max}</span></span>
                </div>
                <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t hairline flex items-center justify-between">
            <span className="text-[11px] text-ink-400">Avg response rate</span>
            <span className="num text-sm font-bold text-ink-200">23%</span>
          </div>
        </div>

        {/* Activity feed */}
        <div className="col-span-1 glass rounded-2xl shadow-glass p-5">
          <div className="text-xs font-semibold text-ink-200 mb-4">Recent activity</div>
          <div className="space-y-3">
            {activity.map(({ icon: Icon, color, label, detail, time }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgb(var(--ink-800))' }}>
                  <Icon size={13} className={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-ink-200">{label}</div>
                  <div className="text-[10px] text-ink-400 truncate">{detail}</div>
                </div>
                <div className="text-[10px] text-ink-500 shrink-0 mono">{time}</div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full flex items-center justify-center gap-1 text-[11px] text-ink-400 hover:text-ink-200 transition-colors pt-3 border-t hairline">
            View all <ChevronRightIcon size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
