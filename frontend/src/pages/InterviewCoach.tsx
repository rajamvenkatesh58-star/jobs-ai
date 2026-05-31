import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  MicIcon, SkipForwardIcon, RepeatIcon, PlayCircleIcon,
  CalendarIcon, TrophyIcon, ChevronRightIcon, BarChart2Icon,
  StopCircleIcon, AlertCircleIcon,
} from "lucide-react";
import {
  useInterviewSessions, useCreateSession, useStartSession,
  useSubmitAnswer, useCompleteSession, sessionAvgScore,
} from "../hooks/useInterview";
import { useJobs } from "../hooks/useJobs";
import { useToast } from "../components/Toast";
import type { AnswerResult, InterviewSession, Question } from "../types";
import { formatDistanceToNow } from "../utils/time";

const TYPE_COLOR: Record<string, string> = {
  behavioural: "bg-indigo-50 text-indigo-700 border-indigo-200",
  technical: "bg-cyan-50 text-cyan-700 border-cyan-200",
  company: "bg-amber-50 text-amber-700 border-amber-200",
};

function WaveformAvatar({ speaking }: { speaking: boolean }) {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(135deg, rgb(var(--accent) / 0.15), rgb(var(--accent2) / 0.15))" }} />
      <div className="w-16 h-16 rounded-full flex items-center justify-center z-10"
        style={{ background: "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))" }}>
        {speaking ? (
          <div className="flex items-end gap-0.5 h-6">
            {[1, 2, 3, 4, 5].map((_, i) => (
              <div key={i} className="w-1 rounded-full bg-white wf-bar" style={{ height: "100%", animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        ) : (
          <MicIcon size={22} className="text-white" />
        )}
      </div>
    </div>
  );
}

export function InterviewCoach() {
  const { data: sessions, isLoading: sessionsLoading } = useInterviewSessions();
  const { data: jobs } = useJobs(70);
  const createSession = useCreateSession();
  const startSession = useStartSession();
  const submitAnswer = useSubmitAnswer();
  const completeSession = useCompleteSession();
  const { toast } = useToast();

  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [debrief, setDebrief] = useState<InterviewSession | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const questions: Question[] = activeSession?.question_bank ?? [];
  const question: Question | undefined = questions[currentQIdx];
  const avgScore = sessionAvgScore(sessions ?? []);

  // Start a new session for selected job
  const handleCreate = async () => {
    if (!selectedJobId) { toast("Select a job first"); return; }
    try {
      const session = await createSession.mutateAsync(selectedJobId);
      const started = await startSession.mutateAsync(session.id);
      setActiveSession(started);
      setCurrentQIdx(0);
      setLastResult(null);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast(msg ?? "Failed to start session — check your profile is complete");
    }
  };

  // Start/stop browser audio recording
  const toggleRecording = useCallback(async () => {
    if (recording) {
      mediaRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!activeSession || !question) return;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const b64 = await blobToBase64(blob);
        try {
          const result = await submitAnswer.mutateAsync({
            sessionId: activeSession.id,
            questionId: question.id,
            audioB64: b64,
          });
          setLastResult(result);
          setActiveSession((prev) => prev ? {
            ...prev,
            question_bank: prev.question_bank?.map((q) =>
              q.id === result.question_id ? { ...q, ...result } : q
            ) ?? null,
          } : null);
        } catch {
          toast("Failed to submit answer — please try again");
        }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      toast("Microphone access denied");
    }
  }, [recording, activeSession, question, submitAnswer, toast]);

  useEffect(() => {
    if (mediaRef.current?.state === "recording" && !recording) {
      mediaRef.current.stop();
    }
    if (recording && mediaRef.current?.state !== "recording") {
      setRecording(false);
    }
  }, [recording]);

  // When MediaRecorder stops, flip recording state
  useEffect(() => {
    const mr = mediaRef.current;
    if (!mr) return;
    const handler = () => setRecording(false);
    mr.addEventListener("stop", handler);
    return () => mr.removeEventListener("stop", handler);
  });

  const handleNext = () => {
    setCurrentQIdx((i) => Math.min(i + 1, questions.length - 1));
    setLastResult(null);
  };

  const handleComplete = async () => {
    if (!activeSession) return;
    try {
      const result = await completeSession.mutateAsync(activeSession.id);
      setDebrief(result);
      setActiveSession(null);
    } catch { toast("Failed to generate debrief"); }
  };

  if (sessionsLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full w-8 h-8 border-2 border-t-transparent" style={{ borderColor: "rgb(var(--accent))", borderTopColor: "transparent" }} />
      </div>
    );
  }

  // Debrief view
  if (debrief) {
    return (
      <div className="p-6 max-w-[900px] mx-auto animate-fade-in">
        <div className="glass rounded-2xl shadow-glass p-8 text-center mb-6">
          <div className="num text-5xl font-bold grad-text mb-2">{debrief.overall_score ?? "—"}</div>
          <div className="text-sm font-semibold text-ink-300">Overall Score</div>
          <div className="text-xs text-ink-500 mt-1">Session completed</div>
        </div>
        {debrief.debrief_report && (
          <div className="glass rounded-2xl shadow-glass p-6">
            <div className="text-xs font-bold text-ink-300 uppercase tracking-wider mb-4">Debrief Report</div>
            <div className="text-xs text-ink-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: debrief.debrief_report }} />
          </div>
        )}
        <div className="mt-4 flex gap-3">
          <button onClick={() => { setDebrief(null); setCurrentQIdx(0); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold glass text-ink-200">
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="grid grid-cols-[280px_1fr_260px] gap-5 h-[calc(100vh-96px)]">

        {/* Left — Session setup */}
        <div className="flex flex-col gap-4 overflow-y-auto scrollbar-thin pr-1">
          {/* Job selector */}
          <div className="glass rounded-2xl shadow-glass p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarIcon size={14} className="text-ink-400" />
              <span className="text-xs font-semibold text-ink-300">Start New Session</span>
            </div>
            {(jobs ?? []).length === 0 ? (
              <div className="text-xs text-ink-500">
                No high-match jobs found. Ingest jobs first from the Dashboard.
              </div>
            ) : (
              <>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full glass rounded-xl px-3 py-2 text-xs text-ink-200 outline-none mb-3"
                  style={{ border: "1px solid var(--glass-border)" }}
                >
                  <option value="">Select a job…</option>
                  {(jobs ?? []).map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} — {j.company ?? "Unknown"} ({j.my_score ?? "?"}%)
                    </option>
                  ))}
                </select>
                <button onClick={handleCreate}
                  disabled={!selectedJobId || createSession.isPending || startSession.isPending}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                  style={{ background: "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))" }}>
                  <PlayCircleIcon size={16} />
                  {createSession.isPending || startSession.isPending ? "Starting…" : "Start Session"}
                </button>
              </>
            )}
          </div>

          {/* Past sessions */}
          <div className="glass rounded-2xl shadow-glass p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2Icon size={14} className="text-ink-400" />
              <span className="text-xs font-semibold text-ink-300">Past Sessions</span>
            </div>
            {(sessions ?? []).length === 0 ? (
              <div className="text-xs text-ink-500">No sessions yet</div>
            ) : (
              <div className="space-y-2.5">
                {(sessions ?? []).slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ background: "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))" }}>
                      {s.overall_score ?? "—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-ink-200 truncate capitalize">{s.status.replace("_", " ")}</div>
                      <div className="text-[10px] text-ink-500">{formatDistanceToNow(s.created_at)}</div>
                    </div>
                    <ChevronRightIcon size={12} className="text-ink-500" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {avgScore !== null && (
            <div className="glass rounded-2xl shadow-glass p-4">
              <div className="text-xs font-semibold text-ink-300 mb-2">Average Score</div>
              <div className="num text-2xl font-bold grad-text">{avgScore}</div>
              <div className="text-[10px] text-ink-500 mt-0.5">across {(sessions ?? []).filter((s) => s.overall_score !== null).length} sessions</div>
            </div>
          )}
        </div>

        {/* Centre — Live session */}
        <div className="glass rounded-2xl shadow-glass p-6 flex flex-col items-center gap-5">
          {!activeSession ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgb(var(--accent) / 0.1)" }}>
                <MicIcon size={32} style={{ color: "rgb(var(--accent))" }} />
              </div>
              <div>
                <div className="font-bold text-ink-200">Ready to practise?</div>
                <div className="text-xs text-ink-400 mt-1">Select a job and click Start Session</div>
              </div>
            </div>
          ) : (
            <>
              <div className="w-full flex items-center justify-between text-xs text-ink-400">
                <span className="truncate max-w-[60%]">
                  {jobs?.find((j) => j.id === activeSession.job_id)?.title ?? "Interview Session"}
                </span>
                <span className="mono num shrink-0">Question {currentQIdx + 1} of {questions.length}</span>
              </div>

              <WaveformAvatar speaking={recording} />

              {question ? (
                <div className="w-full text-center">
                  <span className={clsx("text-[10px] font-bold px-2 py-1 rounded border", TYPE_COLOR[question.type] ?? "")}>
                    {question.type}
                  </span>
                  <p className="mt-3 text-sm font-semibold text-ink-100 leading-relaxed">{question.question}</p>
                  <p className="mt-1 text-xs text-ink-500 italic">{question.guidance}</p>
                </div>
              ) : (
                <p className="text-xs text-ink-500">Loading question…</p>
              )}

              {/* Progress */}
              <div className="w-full flex gap-1">
                {questions.map((_, i) => (
                  <div key={i} className="flex-1 h-1 rounded-full" style={{
                    background: i < currentQIdx ? "rgb(var(--accent))" : i === currentQIdx ? "rgb(var(--accent) / 0.4)" : "rgb(var(--ink-800))",
                  }} />
                ))}
              </div>

              {/* Last result */}
              {lastResult && (
                <div className="w-full glass rounded-xl p-3 text-xs text-ink-300 leading-relaxed">
                  <div className="font-semibold text-ink-200 mb-1">Transcript received ✓</div>
                  <div className="text-[10px] text-ink-500 line-clamp-3">{lastResult.transcript}</div>
                  <div className="flex gap-3 mt-2 text-[10px]">
                    <span>STAR: <b>{lastResult.star_score}</b></span>
                    <span>Clarity: <b>{lastResult.clarity_score}%</b></span>
                    <span>Relevance: <b>{lastResult.relevance_score}%</b></span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <button onClick={() => { setCurrentQIdx((i) => Math.max(0, i - 1)); setLastResult(null); }}
                  className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-200 transition-colors px-3 py-2 rounded-lg glass">
                  <RepeatIcon size={13} />Repeat
                </button>

                <button onClick={toggleRecording} disabled={submitAnswer.isPending}
                  className={clsx("w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-glow disabled:opacity-60",
                    recording ? "animate-pulse-soft" : "hover:scale-105")}
                  style={{ background: recording ? "#E11D48" : "rgb(var(--accent))" }}>
                  {recording ? <StopCircleIcon size={22} className="text-white" /> : <MicIcon size={22} className="text-white" />}
                </button>

                {currentQIdx < questions.length - 1 ? (
                  <button onClick={handleNext} className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-200 transition-colors px-3 py-2 rounded-lg glass">
                    <SkipForwardIcon size={13} />Skip
                  </button>
                ) : (
                  <button onClick={handleComplete} disabled={completeSession.isPending}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white disabled:opacity-60"
                    style={{ background: "#059669" }}>
                    <TrophyIcon size={13} />{completeSession.isPending ? "…" : "Finish"}
                  </button>
                )}
              </div>

              {submitAnswer.isPending && (
                <div className="text-xs text-ink-400 animate-pulse">Transcribing & scoring…</div>
              )}
            </>
          )}
        </div>

        {/* Right — Live scoring */}
        <div className="flex flex-col gap-4 overflow-y-auto scrollbar-thin pl-1">
          {activeSession && lastResult ? (
            <>
              <div className="glass rounded-2xl shadow-glass p-4">
                <div className="text-xs font-semibold text-ink-300 mb-3">Last Answer Scores</div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "S", val: Math.round(lastResult.star_score * 0.25) },
                    { label: "T", val: Math.round(lastResult.star_score * 0.25) },
                    { label: "A", val: Math.round(lastResult.star_score * 0.25) },
                    { label: "R", val: Math.round(lastResult.star_score * 0.25) },
                  ].map(({ label, val }) => (
                    <div key={label} className="text-center">
                      <div className="num text-base font-bold text-ink-100">{val}</div>
                      <div className="text-[10px] text-ink-500">{label}</div>
                      <div className="h-1 rounded-full bg-ink-800 mt-1 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(val / 25) * 100}%`, background: "rgb(var(--accent))" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t hairline pt-3">
                  <span className="text-xs text-ink-400">STAR Total</span>
                  <span className="num text-sm font-bold text-ink-100">{lastResult.star_score}<span className="text-ink-500">/100</span></span>
                </div>
              </div>

              <div className="glass rounded-2xl shadow-glass p-4 space-y-3">
                <div className="text-xs font-semibold text-ink-300">Live Scores</div>
                {[{ label: "Clarity", val: lastResult.clarity_score }, { label: "Relevance", val: lastResult.relevance_score }, { label: "Completeness", val: lastResult.completeness_score }].map(({ label, val }) => (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-ink-400">{label}</span>
                      <span className="num text-[11px] font-bold text-ink-200">{val}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-ink-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${val}%`, background: val >= 80 ? "#059669" : "#D97706" }} />
                    </div>
                  </div>
                ))}
              </div>

              {lastResult.feedback && (
                <div className="glass rounded-2xl shadow-glass p-4">
                  <div className="text-xs font-semibold text-ink-300 mb-2">AI Feedback</div>
                  <p className="text-xs text-ink-400 leading-relaxed">{lastResult.feedback}</p>
                </div>
              )}
            </>
          ) : (
            <div className="glass rounded-2xl shadow-glass p-5 flex flex-col items-center justify-center h-48 text-center">
              <AlertCircleIcon size={24} className="text-ink-600 mb-2" />
              <p className="text-xs text-ink-500">Scores appear here after each answer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
