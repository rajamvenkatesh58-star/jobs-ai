import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Application } from "../types";

export const APP_KEYS = {
  all: ["applications"] as const,
  detail: (id: string) => ["applications", id] as const,
};

export function useApplications() {
  return useQuery({
    queryKey: APP_KEYS.all,
    queryFn: () => api.get<Application[]>("/applications/").then((r) => r.data),
    staleTime: 30_000,
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: APP_KEYS.detail(id),
    queryFn: () => api.get<Application>(`/applications/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Application["status"] }) =>
      api.patch<Application>(`/applications/${id}/status`, { status }).then((r) => r.data),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: APP_KEYS.all });
      const prev = qc.getQueryData<Application[]>(APP_KEYS.all);
      qc.setQueryData<Application[]>(APP_KEYS.all, (old) =>
        old?.map((a) => (a.id === id ? { ...a, status } : a)) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(APP_KEYS.all, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: APP_KEYS.all }),
  });
}

export function useApplicationStats(applications: Application[] | undefined) {
  if (!applications) return { total_active: 0, submitted: 0, interviews: 0, offers: 0 };
  const active = applications.filter((a) => a.status !== "dismissed");
  const submitted = applications.filter((a) => a.status === "submitted").length;
  return { total_active: active.length, submitted, interviews: 0, offers: 0 };
}
