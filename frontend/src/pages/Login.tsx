import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ZapIcon } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        await api.post("/auth/register", { email, password, full_name: fullName });
      }
      const form = new URLSearchParams();
      form.append("username", email);
      form.append("password", password);
      const { data } = await api.post("/auth/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      localStorage.setItem("access_token", data.access_token);
      navigate("/");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Something went wrong";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(1100px 560px at 80% -10%, rgb(79 70 229 / 0.12), transparent 60%), radial-gradient(900px 500px at -8% 28%, rgb(8 145 178 / 0.10), transparent 60%), linear-gradient(180deg, #EEF2F9, #E7ECF5)',
      }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, rgb(79,70,229), rgb(8,145,178))', boxShadow: '0 0 0 1px rgb(79 70 229 / 0.28), 0 12px 30px -10px rgb(79 70 229 / 0.35)' }}>
            <ZapIcon size={22} className="text-white" />
          </div>
          <div className="text-xl font-bold text-ink-100">CareerOps AU</div>
          <div className="text-sm text-ink-400 mt-0.5">AI Career Acceleration</div>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl shadow-glass p-8">
          {/* Mode tabs */}
          <div className="flex rounded-xl overflow-hidden mb-6" style={{ border: '1px solid var(--glass-border)' }}>
            {(["login", "register"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); }}
                className="flex-1 py-2 text-xs font-semibold capitalize transition-all"
                style={mode === m
                  ? { background: 'rgb(var(--accent))', color: 'white' }
                  : { color: 'rgb(var(--ink-400))' }}>
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-[11px] font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                  placeholder="Alex Nguyen"
                  className="w-full glass rounded-xl px-3.5 py-2.5 text-sm text-ink-200 outline-none transition-all placeholder:text-ink-600"
                  style={{ border: '1px solid var(--glass-border)' }} />
              </div>
            )}
            <div>
              <label className="block text-[11px] font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                className="w-full glass rounded-xl px-3.5 py-2.5 text-sm text-ink-200 outline-none transition-all placeholder:text-ink-600"
                style={{ border: '1px solid var(--glass-border)' }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-400 uppercase tracking-wider mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                placeholder="Min 8 characters"
                className="w-full glass rounded-xl px-3.5 py-2.5 text-sm text-ink-200 outline-none transition-all placeholder:text-ink-600"
                style={{ border: '1px solid var(--glass-border)' }} />
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent2)))', boxShadow: '0 0 0 1px rgb(79 70 229 / 0.28), 0 12px 30px -10px rgb(79 70 229 / 0.35)' }}>
              {loading ? "…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
