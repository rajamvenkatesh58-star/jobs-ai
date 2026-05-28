import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MicIcon, MicOffIcon, PlayCircleIcon, CheckCircleIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { interviewApi, type InterviewSession, type Question } from "../api/interview";
import { ScoreBadge } from "../components/ScoreBadge";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function QuestionPanel({
  session,
  question,
  index,
  total,
  onNext,
}: {
  session: InterviewSession;
  question: Question;
  index: number;
  total: number;
  onNext: () => void;
}) {
  const qc = useQueryClient();
  const [recording, setRecording] = useState(false);
  const [submitted, setSubmitted] = useState(!!question.star_score);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const answerMutation = useMutation({
    mutationFn: (b64: string) =>
      interviewApi.submitAnswer(session.id, question.id, b64),
    onSuccess: () => {
      setSubmitted(true);
      qc.invalidateQueries({ queryKey: ["session", session.id] });
    },
  });

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/wav" });
      const buffer = await blob.arrayBuffer();
      const b64 = arrayBufferToBase64(buffer);
      answerMutation.mutate(b64);
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
    mediaRef.current = recorder;
    setRecording(true);
  }, [answerMutation]);

  const stopRecording = useCallback(() => {
    mediaRef.current?.stop();
    setRecording(false);
  }, []);

  const audioUrl = interviewApi.getQuestionAudioUrl(session.id, question.id);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          {question.type} · Q{index + 1} of {total}
        </span>
        {submitted && question.star_score !== undefined && (
          <ScoreBadge score={question.star_score} />
        )}
      </div>

      <p className="text-base font-medium text-gray-900">{question.question}</p>
      <p className="text-sm text-gray-500 italic">{question.guidance}</p>

      <div className="flex items-center gap-3">
        <audio controls src={audioUrl} className="h-8 w-48" preload="none" />
        {!submitted && (
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={answerMutation.isPending}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              recording
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            } disabled:opacity-50`}
          >
            {recording ? <MicOffIcon size={15} /> : <MicIcon size={15} />}
            {recording ? "Stop Recording" : "Record Answer"}
          </button>
        )}
        {answerMutation.isPending && (
          <span className="text-sm text-gray-400">Transcribing & scoring…</span>
        )}
      </div>

      {submitted && question.feedback && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs font-semibold text-blue-700 mb-1">Feedback</p>
          <p className="text-sm text-blue-800">{question.feedback}</p>
          {question.answer_transcript && (
            <details className="mt-2">
              <summary className="text-xs text-blue-500 cursor-pointer">Show transcript</summary>
              <p className="mt-1 text-xs text-gray-600">{question.answer_transcript}</p>
            </details>
          )}
        </div>
      )}

      {submitted && index < total - 1 && (
        <button
          onClick={onNext}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Next question →
        </button>
      )}
    </div>
  );
}

export function InterviewCoach() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job_id");
  const qc = useQueryClient();
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: interviewApi.listSessions,
  });

  const { data: session } = useQuery({
    queryKey: ["session", activeSession],
    queryFn: () => interviewApi.getSession(activeSession!),
    enabled: !!activeSession,
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: (jid: string) => interviewApi.createSession(jid),
    onSuccess: (s) => {
      setActiveSession(s.id);
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => interviewApi.startSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session", activeSession] }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => interviewApi.completeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["session", activeSession] }),
  });

  const questions: Question[] = session?.question_bank ?? [];

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Interview Coach</h1>
      <p className="mt-1 text-sm text-gray-500">
        AI-powered voice mock interviews with STAR-framework scoring.
      </p>

      {!activeSession && (
        <div className="mt-8 space-y-6">
          {jobId && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-700">
                Start a practice interview for the selected job.
              </p>
              <button
                onClick={() => createMutation.mutate(jobId)}
                disabled={createMutation.isPending}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-60"
              >
                <PlayCircleIcon size={16} />
                {createMutation.isPending ? "Generating questions…" : "Generate Question Bank"}
              </button>
            </div>
          )}

          {sessions.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3">Past Sessions</h2>
              <ul className="space-y-2">
                {sessions.map((s: InterviewSession) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Session {s.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {s.status} · {new Date(s.created_at).toLocaleDateString("en-AU")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.overall_score !== null && (
                        <ScoreBadge score={s.overall_score} />
                      )}
                      <button
                        onClick={() => setActiveSession(s.id)}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        Open
                      </button>
                      {s.status === "debrief_ready" && (
                        <a
                          href={interviewApi.debriefDownloadUrl(s.id)}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download Debrief PDF
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeSession && session && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Status: <span className="font-semibold">{session.status}</span>
              </p>
              {session.overall_score !== null && (
                <p className="text-sm text-gray-500">
                  Overall score: <ScoreBadge score={session.overall_score} />
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {session.status === "question_bank_ready" && (
                <button
                  onClick={() => startMutation.mutate(session.id)}
                  className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700"
                >
                  Start Session
                </button>
              )}
              {session.status === "in_progress" &&
                questions.every((q) => q.star_score !== undefined) && (
                  <button
                    onClick={() => completeMutation.mutate(session.id)}
                    disabled={completeMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircleIcon size={15} />
                    {completeMutation.isPending ? "Generating debrief…" : "Complete & Get Debrief"}
                  </button>
                )}
              {session.status === "debrief_ready" && (
                <a
                  href={interviewApi.debriefDownloadUrl(session.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
                >
                  Download Debrief PDF
                </a>
              )}
              <button
                onClick={() => setActiveSession(null)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                ← Back
              </button>
            </div>
          </div>

          {session.status !== "question_bank_ready" && questions.length > 0 && (
            <QuestionPanel
              session={session}
              question={questions[currentQ]}
              index={currentQ}
              total={questions.length}
              onNext={() => setCurrentQ((n) => Math.min(n + 1, questions.length - 1))}
            />
          )}
        </div>
      )}
    </div>
  );
}
