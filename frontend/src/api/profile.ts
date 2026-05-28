import { api } from "./client";

export interface CandidateProfile {
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

export interface ScoringWeights {
  skills_match: number;
  experience_level: number;
  location: number;
  salary: number;
}

export const profileApi = {
  get: () => api.get<CandidateProfile>("/profile/").then((r) => r.data),
  update: (data: Partial<CandidateProfile>) =>
    api.put<CandidateProfile>("/profile/", data).then((r) => r.data),
};
