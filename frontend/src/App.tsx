import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ToastProvider, useToast } from "./components/Toast";
import { Dashboard } from "./pages/Dashboard";
import { InterviewCoach } from "./pages/InterviewCoach";
import { JobQueue } from "./pages/JobQueue";
import { Login } from "./pages/Login";
import { Profile } from "./pages/Profile";
import { Tracker } from "./pages/Tracker";
import { api } from "./api/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("access_token");
  const [verified, setVerified] = useState<boolean | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { setVerified(false); return; }
    api.get("/auth/me")
      .then(() => setVerified(true))
      .catch(() => {
        localStorage.removeItem("access_token");
        toast("Session expired — please sign in again");
        setVerified(false);
        navigate("/login", { replace: true });
      });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (verified === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full w-8 h-8 border-2 border-t-transparent"
          style={{ borderColor: "rgb(var(--accent))", borderTopColor: "transparent" }} />
      </div>
    );
  }
  if (!verified) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs" element={<JobQueue />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/interview" element={<InterviewCoach />} />
            <Route path="/tracker" element={<Tracker />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </QueryClientProvider>
  );
}
