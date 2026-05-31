import { useState } from "react";
import clsx from "clsx";
import { XIcon, CalendarIcon, ClockIcon, ChevronRightIcon, SendIcon, EyeIcon, MicIcon, TrophyIcon, ArchiveIcon } from "lucide-react";

interface Card { id: number; title: string; company: string; applied: string; days: number; next?: string; }
type Col = { id: string; label: string; icon: React.ElementType; color: string; cards: Card[]; };

const COLUMNS: Col[] = [
  { id: "applied", label: "Applied", icon: SendIcon, color: "rgb(var(--accent))", cards: [
    { id: 1, title: "Data Engineer", company: "Canva", applied: "28 May", days: 3 },
    { id: 2, title: "ML Engineer", company: "Seek", applied: "27 May", days: 4, next: "Follow up by Fri" },
  ]},
  { id: "viewed", label: "Viewed", icon: EyeIcon, color: "rgb(var(--accent2))", cards: [
    { id: 3, title: "Senior Data Engineer", company: "Telstra", applied: "25 May", days: 6 },
    { id: 4, title: "Analytics Lead", company: "NAB", applied: "24 May", days: 7, next: "Check status Mon" },
  ]},
  { id: "interview_scheduled", label: "Interview Scheduled", icon: CalendarIcon, color: "#D97706", cards: [
    { id: 5, title: "Data Platform Lead", company: "ANZ Bank", applied: "20 May", days: 11, next: "Wed 3 Jun 3:30pm" },
  ]},
  { id: "interview_done", label: "Interview Done", icon: MicIcon, color: "#7C3AED", cards: [
    { id: 6, title: "Data Lead", company: "Westpac", applied: "15 May", days: 16, next: "Await decision" },
  ]},
  { id: "offer", label: "Offer Received", icon: TrophyIcon, color: "#059669", cards: [
    { id: 7, title: "Senior Data Engineer", company: "Macquarie Group", applied: "10 May", days: 21, next: "Respond by 5 Jun" },
  ]},
  { id: "closed", label: "Closed", icon: ArchiveIcon, color: "rgb(var(--ink-500))", cards: [
    { id: 8, title: "Data Scientist", company: "Atlassian", applied: "1 May", days: 30 },
    { id: 9, title: "ML Engineer", company: "Afterpay", applied: "28 Apr", days: 33 },
    { id: 10, title: "Data Engineer", company: "REA Group", applied: "20 Apr", days: 41 },
  ]},
];

const METRICS = [
  { label: "Active Applications", value: "9" },
  { label: "Avg Response Rate", value: "23%" },
  { label: "Interviews This Month", value: "3" },
  { label: "Offers This Month", value: "1" },
];

function DetailPanel({ card, onClose }: { card: Card; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[420px] glass-strong h-full overflow-y-auto scrollbar-thin shadow-glass flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b hairline sticky top-0 glass-strong z-10">
          <div>
            <div className="font-bold text-ink-100 text-sm">{card.title}</div>
            <div className="text-xs text-ink-400">{card.company} · Applied {card.applied}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-800/30 text-ink-400 hover:text-ink-200 transition-colors">
            <XIcon size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Timeline */}
          <div>
            <div className="text-xs font-semibold text-ink-300 mb-3">Application Timeline</div>
            <div className="space-y-3">
              {[
                { label: "Applied", date: card.applied, done: true },
                { label: "Application Viewed", date: "29 May", done: card.days >= 2 },
                { label: "Interview Scheduled", date: "30 May", done: card.days >= 11 },
                { label: "Offer / Decision", date: "TBD", done: false },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={clsx("w-2.5 h-2.5 rounded-full shrink-0", step.done ? "bg-mint" : "bg-ink-700")} />
                  <span className={clsx("text-xs flex-1", step.done ? "text-ink-200 font-medium" : "text-ink-500")}>{step.label}</span>
                  <span className="text-[10px] text-ink-500 mono">{step.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Next action */}
          {card.next && (
            <div className="glass rounded-xl p-3">
              <div className="text-[10px] font-semibold text-ink-400 uppercase tracking-wider mb-1">Next Action</div>
              <div className="text-xs text-ink-200">{card.next}</div>
            </div>
          )}

          {/* Notes */}
          <div>
            <div className="text-xs font-semibold text-ink-300 mb-2">Notes</div>
            <textarea rows={4} placeholder="Add notes about this application…"
              className="w-full glass rounded-xl px-3 py-2.5 text-xs text-ink-300 outline-none resize-none"
              style={{ border: '1px solid var(--glass-border)' }} />
          </div>

          {/* Days in stage */}
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <ClockIcon size={12} />
            <span>{card.days} days in current stage</span>
          </div>
        </div>

        <div className="px-6 py-4 border-t hairline sticky bottom-0 glass-strong">
          <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: 'rgb(var(--accent))' }}>
            <ChevronRightIcon size={15} /> Advance Stage
          </button>
        </div>
      </div>
    </div>
  );
}

export function Tracker() {
  const [selected, setSelected] = useState<Card | null>(null);

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {METRICS.map(m => (
          <div key={m.label} className="glass rounded-2xl shadow-glass p-4">
            <div className="num text-2xl font-bold text-ink-100">{m.value}</div>
            <div className="text-xs text-ink-400 mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-4">
        {COLUMNS.map(col => {
          const Icon = col.icon;
          return (
            <div key={col.id} className="flex-shrink-0 w-56">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Icon size={13} style={{ color: col.color }} />
                <span className="text-xs font-semibold text-ink-300">{col.label}</span>
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: col.color }}>{col.cards.length}</span>
              </div>
              <div className="space-y-2.5">
                {col.cards.map(card => (
                  <div key={card.id} onClick={() => setSelected(card)}
                    className="glass rounded-xl shadow-glass p-3.5 cursor-pointer hover:shadow-glow transition-all group">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold mb-2"
                      style={{ background: col.color }}>
                      {card.company.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="text-xs font-semibold text-ink-100 leading-tight">{card.title}</div>
                    <div className="text-[10px] text-ink-400 mt-0.5">{card.company}</div>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-ink-500">
                      <CalendarIcon size={9} />{card.applied}
                      <span className="ml-1 mono">{card.days}d</span>
                    </div>
                    {card.next && (
                      <div className="mt-2 text-[9px] font-medium px-2 py-1 rounded-lg" style={{ background: `${col.color}18`, color: col.color }}>
                        {card.next}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selected && <DetailPanel card={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
