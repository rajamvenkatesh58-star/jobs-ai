export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface Job {
  id: string;
  seek_job_id: string;
  title: string;
  company: string | null;
  location: string | null;
  category: string | null;
  work_type: string | null;
  salary_range: string | null;
  description: string | null;
  listing_url: string;
  published_at: string | null;
  ingested_at: string;
  my_score: number | null;
  my_score_reasoning: string | null;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: "pending_review" | "approved" | "dismissed" | "submitted";
  match_score: number | null;
  score_reasoning: string | null;
  resume_text: string | null;
  cover_letter_text: string | null;
  resume_pdf_path: string | null;
  cover_letter_pdf_path: string | null;
  created_at: string;
  reviewed_at: string | null;
  submitted_at: string | null;
}

export interface WorkExperience {
  company: string;
  role: string;
  location?: string;
  start_date: string;
  end_date?: string;
  achievements: string[];
  technologies: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field_of_study: string;
  graduation_year: number;
  gpa?: number;
}

export interface Certification {
  name: string;
  issuer: string;
  year: number;
  url?: string;
}

export interface Language {
  language: string;
  proficiency: string;
}

export interface ScoringWeights {
  skills_match: number;
  experience_level: number;
  location: number;
  salary: number;
}

export interface Profile {
  id: string;
  user_id: string;
  phone: string | null;
  location_suburb: string | null;
  location_state: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  professional_summary: string | null;
  work_experience: WorkExperience[] | null;
  education: Education[] | null;
  technical_skills: string[] | null;
  certifications: Certification[] | null;
  languages: Language[] | null;
  desired_job_titles: string[] | null;
  desired_locations: string[] | null;
  salary_min_aud: number | null;
  salary_max_aud: number | null;
  work_type: string | null;
  seek_keywords: string[] | null;
  seek_locations: string[] | null;
  seek_categories: string[] | null;
  min_score_threshold: number | null;
  scoring_weights: ScoringWeights | null;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  type: "behavioural" | "technical" | "company";
  question: string;
  guidance: string;
  audio_path?: string;
  answer_transcript?: string;
  star_score?: number;
  clarity_score?: number;
  relevance_score?: number;
  completeness_score?: number;
  feedback?: string;
}

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

export interface AnswerResult {
  question_id: string;
  transcript: string;
  star_score: number;
  clarity_score: number;
  relevance_score: number;
  completeness_score: number;
  feedback: string;
}

// Derived type used in Job Queue — job + its application joined client-side
export type JobQueueItem = Job & {
  application: Application | null;
  uiState: "NEW" | "TAILORED" | "READY" | "SENT";
};
