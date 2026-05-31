import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { AnswerResult, InterviewSession } from "../types";

export const IV_KEYS = {
  all: ["interview", "sessions"] as const,
  detail: (id: string) => ["interview", "sessions", id] as const,
};

export function useInterviewSessions() {
  return useQuery({
    queryKey: IV_KEYS.all,
    queryFn: () =>
      api.get<InterviewSession[]>("/interview/sessions").then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useInterviewSession(id: string) {
  return useQuery({
    queryKey: IV_KEYS.detail(id),
    queryFn: () =>
      api.get<InterviewSession>(`/interview/sessions/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      api
        .post<InterviewSession>("/interview/sessions", { job_id: jobId })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: IV_KEYS.all }),
  });
}

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api
        .post<InterviewSession>(`/interview/sessions/${sessionId}/start`)
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(IV_KEYS.detail(data.id), data);
    },
  });
}

export function useSubmitAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      questionId,
      audioB64,
    }: {
      sessionId: string;
      questionId: string;
      audioB64: string;
    }) =>
      api
        .post<AnswerResult>(`/interview/sessions/${sessionId}/answers`, {
          question_id: questionId,
          audio_data_b64: audioB64,
        })
        .then((r) => r.data),
    onSuccess: (_data, { sessionId }) => {
      qc.invalidateQueries({ queryKey: IV_KEYS.detail(sessionId) });
    },
  });
}

export function useCompleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api
        .post<InterviewSession>(`/interview/sessions/${sessionId}/complete`)
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(IV_KEYS.detail(data.id), data);
      qc.invalidateQueries({ queryKey: IV_KEYS.all });
    },
  });
}

export function sessionAvgScore(sessions: InterviewSession[]): number | null {
  const scored = sessions.filter((s) => s.overall_score !== null);
  if (!scored.length) return null;
  return Math.round(
    scored.reduce((sum, s) => sum + (s.overall_score ?? 0), 0) / scored.length
  );
}
