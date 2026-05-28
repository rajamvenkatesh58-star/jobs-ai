import { api } from "./client";

export interface InterviewSession {
  id: string;
  user_id: string;
  job_id: string | null;
  application_id: string | null;
  status: "question_bank_ready" | "in_progress" | "completed" | "debrief_ready";
  question_bank: Question[] | null;
  overall_score: number | null;
  debrief_report: string | null;
  debrief_pdf_path: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  type: "behavioural" | "technical" | "company";
  question: string;
  guidance: string;
  answer_transcript?: string;
  star_score?: number;
  clarity_score?: number;
  relevance_score?: number;
  completeness_score?: number;
  feedback?: string;
}

export interface AnswerResult {
  question_id: string;
  transcript: string;
  star_score: number;
  clarity_score: number;
  relevance_score: number;
  completeness_score: number;
  feedback: string;
}

export const interviewApi = {
  createSession: (jobId: string) =>
    api.post<InterviewSession>("/interview/sessions", { job_id: jobId }).then((r) => r.data),

  listSessions: () =>
    api.get<InterviewSession[]>("/interview/sessions").then((r) => r.data),

  getSession: (id: string) =>
    api.get<InterviewSession>(`/interview/sessions/${id}`).then((r) => r.data),

  startSession: (id: string) =>
    api.post<InterviewSession>(`/interview/sessions/${id}/start`).then((r) => r.data),

  getQuestionAudioUrl: (sessionId: string, questionId: string) =>
    `/api/interview/sessions/${sessionId}/questions/${questionId}/audio`,

  submitAnswer: (sessionId: string, questionId: string, audioDataB64: string) =>
    api
      .post<AnswerResult>(`/interview/sessions/${sessionId}/answers`, {
        question_id: questionId,
        audio_data_b64: audioDataB64,
      })
      .then((r) => r.data),

  completeSession: (id: string) =>
    api.post<InterviewSession>(`/interview/sessions/${id}/complete`).then((r) => r.data),

  debriefDownloadUrl: (id: string) => `/api/interview/sessions/${id}/debrief/download`,
};
