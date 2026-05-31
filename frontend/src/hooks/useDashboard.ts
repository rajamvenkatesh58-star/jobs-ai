import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "../api/client";
import type { Application, InterviewSession, Job } from "../types";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function useDashboard() {
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["jobs", "dashboard"],
    queryFn: () => api.get<Job[]>("/jobs/?min_score=0&limit=200").then((r) => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ["applications", "dashboard"],
    queryFn: () => api.get<Application[]>("/applications/").then((r) => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["interview", "sessions", "dashboard"],
    queryFn: () =>
      api.get<InterviewSession[]>("/interview/sessions").then((r) => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Ticker: high-match jobs, polled every 30s
  const { data: tickerJobs } = useQuery({
    queryKey: ["jobs", "ticker"],
    queryFn: () => api.get<Job[]>("/jobs/?min_score=70&limit=10").then((r) => r.data),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const stats = useMemo(() => {
    const today = todayStr();
    const scannedToday = (jobs ?? []).filter((j) => j.ingested_at.slice(0, 10) === today).length;
    const highMatches = (jobs ?? []).filter((j) => (j.my_score ?? 0) >= 80).length;
    const sent = (applications ?? []).filter((a) => a.status === "submitted").length;
    const interviewSessions = (sessions ?? []).filter(
      (s) => s.status === "in_progress" || s.status === "debrief_ready"
    ).length;
    return { scannedToday, highMatches, sent, interviewSessions };
  }, [jobs, applications, sessions]);

  // Chart: group jobs by ingested_at date (last 14 days)
  const chartData = useMemo(() => {
    const days: { date: string; scanned: number; matched: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayJobs = (jobs ?? []).filter((j) => j.ingested_at.slice(0, 10) === dateStr);
      days.push({
        date: dateStr,
        scanned: dayJobs.length,
        matched: dayJobs.filter((j) => (j.my_score ?? 0) >= 70).length,
      });
    }
    return days;
  }, [jobs]);

  // Weekly application breakdown
  const weeklyStats = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekApps = (applications ?? []).filter(
      (a) => new Date(a.created_at) >= weekAgo
    );
    return {
      tailored: weekApps.filter((a) => a.status === "pending_review").length,
      approved: weekApps.filter((a) => a.status === "approved").length,
      sent: weekApps.filter((a) => a.status === "submitted").length,
      target: 15,
    };
  }, [applications]);

  // Activity feed: derived from latest applications + sessions
  const activity = useMemo(() => {
    const events: { type: string; label: string; detail: string; time: string }[] = [];
    const sorted = [...(applications ?? [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    sorted.forEach((a) => {
      const label =
        a.status === "submitted"
          ? "Application submitted"
          : a.status === "approved"
          ? "Application approved"
          : "Application created";
      events.push({ type: a.status, label, detail: `Match score: ${a.match_score ?? "N/A"}`, time: a.created_at });
    });
    return events.slice(0, 5);
  }, [applications]);

  return {
    stats,
    chartData,
    weeklyStats,
    activity,
    tickerJobs: tickerJobs ?? [],
    isLoading: jobsLoading || appsLoading || sessionsLoading,
  };
}
