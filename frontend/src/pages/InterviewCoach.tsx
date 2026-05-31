import { useState } from "react";
import clsx from "clsx";
import {
  MicIcon, SkipForwardIcon, RepeatIcon, PlayCircleIcon,
  CalendarIcon, TrophyIcon, ChevronRightIcon, BarChart2Icon,
} from "lucide-react";

const QUESTIONS = [
  { id: 1, text: "Tell me about a time you built a data pipeline that significantly improved performance. Walk me through your approach.", type: "Behavioural" },
  { id: 2, text: "How would you design a real-time data ingestion system for 10 million events per day on Azure?", type: "Technical" },
  { id: 3, text: "Describe a situation where you had to influence stakeholders who were resistant to a data-driven approach.", type: "Behavioural" },
  { id: 4, text: "What's your experience with dbt and how have you used it to improve data reliability?", type: "Technical" },
  { id: 5, text: "Why Telstra, and how do you see data engineering evolving in the telco space?", type: "Company-specific" },
];

const pastSessions = [
  { role: "Data Engineer", company: "Canva", date: "22 May", score: 76 },
  { role: "ML Engineer", company: "Atlassian", date: "18 May", score: 82 },
  { role: "Data Platform Lead", company: "ANZ", date: "14 May", score: 71 },
];

const TYPE_COLOR: Record<string, string> = {
  Behavioural: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Technical: "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Company-specific": "bg-amber-50 text-amber-700 border-amber-200",
};

function WaveformAvatar({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, rgb(var(--accent) / 0.15), rgb(var(--accent2) / 0.15))' }} />
      <div className="w-16 h-16 rounded-full flex items-center justify-center z-10"
        style={{ background: 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))' }}>
        {speaking ? (
          <div className="flex items-end gap-0.5 h-6">
            {[1, 2, 3, 4, 5].map((_, i) => (
              <div key={i} className="w-1 rounded-full bg-white wf-bar"
                style={{ height: '100%', animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        ) : (
          <MicIcon size={22} className="text-white" />
        )}
      </div>
    </div>
  );
}

function MicButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={clsx("w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-glow",
        active ? "animate-pulse-soft" : "hover:scale-105")}
      style={{ background: active ? '#E11D48' : 'rgb(var(--accent))' }}>
      <MicIcon size={22} className="text-white" />
    </button>
  );
}

export function InterviewCoach() {
  const [sessionActive, setSessionActive] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [micActive, setMicActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [scores] = useState([
    { label: "S", val: 18, max: 25 },
    { label: "T", val: 20, max: 25 },
    { label: "A", val: 22, max: 25 },
    { label: "R", val: 19, max: 25 },
  ]);

  const question = QUESTIONS[currentQ];
  const totalScore = scores.reduce((a, b) => a + b.val, 0);

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="grid grid-cols-[280px_1fr_260px] gap-5 h-[calc(100vh-96px)]">

        {/* Left — Session setup */}
        <div className="flex flex-col gap-4 overflow-y-auto scrollbar-thin pr-1">
          {/* Upcoming */}
          <div className="glass rounded-2xl shadow-glass p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarIcon size={14} className="text-ink-400" />
              <span className="text-xs font-semibold text-ink-300">Upcoming Interview</span>
            </div>
            <div className="font-bold text-sm text-ink-100">Senior Data Engineer</div>
            <div className="text-xs text-ink-400 mt-0.5">Telstra · Sydney CBD</div>
            <div className="mt-3 text-xs text-ink-400">
              <span className="font-semibold text-ink-200">Wed 3 Jun</span> · 3:30pm AEST
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex-1 h-1 rounded-full bg-ink-800 overflow-hidden">
                <div className="h-full rounded-full w-3/4" style={{ background: 'rgb(var(--accent))' }} />
              </div>
              <span className="text-[10px] text-ink-500 mono">2d 14h</span>
            </div>
          </div>

          <button onClick={() => setSessionActive(true)}
            className={clsx("w-full py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all",
              sessionActive ? "opacity-60 cursor-default" : "shadow-glow hover:opacity-90")}
            style={{ background: 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))' }}
            disabled={sessionActive}>
            <PlayCircleIcon size={18} />
            {sessionActive ? "Session Active" : "Start Session"}
          </button>

          {/* Past sessions */}
          <div className="glass rounded-2xl shadow-glass p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2Icon size={14} className="text-ink-400" />
              <span className="text-xs font-semibold text-ink-300">Past Sessions</span>
            </div>
            <div className="space-y-2.5">
              {pastSessions.map(s => (
                <div key={s.date} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))' }}>
                    {s.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-ink-200 truncate">{s.role}</div>
                    <div className="text-[10px] text-ink-500">{s.company} · {s.date}</div>
                  </div>
                  <ChevronRightIcon size={12} className="text-ink-500" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Centre — Live session */}
        <div className="glass rounded-2xl shadow-glass p-6 flex flex-col items-center gap-5">
          {!sessionActive ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgb(var(--accent) / 0.1)' }}>
                <MicIcon size={32} style={{ color: 'rgb(var(--accent))' }} />
              </div>
              <div>
                <div className="font-bold text-ink-200">Ready to practise?</div>
                <div className="text-xs text-ink-400 mt-1">Click Start Session to begin your mock interview</div>
              </div>
            </div>
          ) : (
            <>
              <div className="w-full flex items-center justify-between text-xs text-ink-400">
                <span>Senior Data Engineer · Telstra</span>
                <span className="mono num">Question {currentQ + 1} of {QUESTIONS.length}</span>
              </div>

              <WaveformAvatar speaking={!micActive} />

              <div className="w-full text-center">
                <span className={clsx("text-[10px] font-bold px-2 py-1 rounded border", TYPE_COLOR[question.type])}>
                  {question.type}
                </span>
                <p className="mt-3 text-sm font-semibold text-ink-100 leading-relaxed">{question.text}</p>
              </div>

              {/* Progress bar */}
              <div className="w-full flex gap-1">
                {QUESTIONS.map((_, i) => (
                  <div key={i} className="flex-1 h-1 rounded-full" style={{
                    background: i < currentQ ? 'rgb(var(--accent))' : i === currentQ ? 'rgb(var(--accent) / 0.4)' : 'rgb(var(--ink-800))'
                  }} />
                ))}
              </div>

              {/* Transcript */}
              {transcript && (
                <div className="w-full glass rounded-xl p-3 text-xs text-ink-300 leading-relaxed min-h-12">
                  {transcript}
                </div>
              )}

              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-200 transition-colors px-3 py-2 rounded-lg glass">
                  <SkipForwardIcon size={13} />Skip
                </button>
                <MicButton active={micActive} onClick={() => {
                  setMicActive(m => !m);
                  if (micActive) {
                    setTranscript("In my previous role at NAB, I built a Spark-based pipeline processing 2TB of daily transaction data. I redesigned the ingestion layer using Delta Lake which reduced latency by 60%...");
                  }
                }} />
                <button className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-200 transition-colors px-3 py-2 rounded-lg glass"
                  onClick={() => { setCurrentQ(q => Math.max(0, q - 1)); setTranscript(""); }}>
                  <RepeatIcon size={13} />Repeat
                </button>
              </div>

              {currentQ < QUESTIONS.length - 1 && (
                <button onClick={() => { setCurrentQ(q => q + 1); setTranscript(""); setMicActive(false); }}
                  className="text-xs font-semibold px-4 py-2 rounded-lg text-white"
                  style={{ background: 'rgb(var(--accent))' }}>
                  Next Question →
                </button>
              )}
            </>
          )}
        </div>

        {/* Right — Scoring */}
        <div className="flex flex-col gap-4 overflow-y-auto scrollbar-thin pl-1">
          <div className="glass rounded-2xl shadow-glass p-4">
            <div className="text-xs font-semibold text-ink-300 mb-3">STAR Breakdown</div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {scores.map(({ label, val, max }) => (
                <div key={label} className="text-center">
                  <div className="num text-base font-bold text-ink-100">{val}</div>
                  <div className="text-[10px] text-ink-500">{label}</div>
                  <div className="h-1 rounded-full bg-ink-800 mt-1 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(val / max) * 100}%`, background: 'rgb(var(--accent))' }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t hairline pt-3">
              <span className="text-xs text-ink-400">Total STAR</span>
              <span className="num text-sm font-bold text-ink-100">{totalScore}<span className="text-ink-500">/100</span></span>
            </div>
          </div>

          <div className="glass rounded-2xl shadow-glass p-4 space-y-3">
            <div className="text-xs font-semibold text-ink-300">Live Scores</div>
            {[{ label: "Clarity", val: 84 }, { label: "Relevance", val: 91 }].map(({ label, val }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] text-ink-400">{label}</span>
                  <span className="num text-[11px] font-bold text-ink-200">{val}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${val}%`, background: val >= 80 ? '#059669' : '#D97706' }} />
                </div>
              </div>
            ))}
          </div>

          <div className="glass rounded-2xl shadow-glass p-4">
            <div className="text-xs font-semibold text-ink-300 mb-2">Session Average</div>
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 shrink-0">
                <svg width="64" height="64" className="ring-score">
                  <circle cx="32" cy="32" r="26" strokeWidth="4" stroke="rgba(15,23,42,0.08)" fill="none" />
                  <circle cx="32" cy="32" r="26" strokeWidth="4" stroke="#059669" fill="none"
                    strokeDasharray={163} strokeDashoffset={163 - 0.82 * 163} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="num text-sm font-bold text-ink-100">82</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-ink-200">Grade B+</div>
                <div className="text-[10px] text-ink-500 mt-0.5">Across 3 answers</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrophyIcon size={10} className="text-amber-500" />
                  <span className="text-[10px] text-amber-600">Strong on relevance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
