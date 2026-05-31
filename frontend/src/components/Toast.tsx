import { createContext, useCallback, useContext, useState } from "react";
import { XIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-react";

type ToastType = "error" | "success" | "info";
interface Toast { id: number; type: ToastType; message: string; }

interface ToastCtx { toast: (message: string, type?: ToastType) => void; }
const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function useToast() { return useContext(Ctx); }

let _id = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "error") => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass-strong rounded-xl shadow-glass px-4 py-3 flex items-start gap-3 animate-slide-up"
            style={{ borderLeft: `3px solid ${t.type === "error" ? "#E11D48" : t.type === "success" ? "#059669" : "rgb(var(--accent))"}` }}
          >
            {t.type === "error" ? (
              <AlertCircleIcon size={15} className="text-coral shrink-0 mt-0.5" />
            ) : (
              <CheckCircleIcon size={15} className="text-mint shrink-0 mt-0.5" />
            )}
            <span className="text-xs text-ink-200 flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-ink-500 hover:text-ink-200">
              <XIcon size={12} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
