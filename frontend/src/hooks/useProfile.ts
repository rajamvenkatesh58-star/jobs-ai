import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Profile } from "../types";

export const PROFILE_KEY = ["profile"] as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => api.get<Profile>("/profile/").then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Profile>) =>
      api.put<Profile>("/profile/", data).then((r) => r.data),
    onSuccess: (updated) => {
      qc.setQueryData(PROFILE_KEY, updated);
    },
  });
}

export function profileCompleteness(p: Profile | undefined): number {
  if (!p) return 0;
  const checks = [
    !!p.phone,
    !!p.location_suburb,
    !!p.professional_summary,
    (p.technical_skills?.length ?? 0) > 0,
    (p.work_experience?.length ?? 0) > 0,
    (p.education?.length ?? 0) > 0,
    (p.desired_job_titles?.length ?? 0) > 0,
    !!p.salary_min_aud,
    (p.seek_keywords?.length ?? 0) > 0,
    !!p.linkedin_url,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
