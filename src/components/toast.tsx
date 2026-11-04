"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info, X, type LucideIcon } from "lucide-react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; type: ToastType; message: string };

const ToastContext = createContext<{
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
} | null>(null);

let nextId = 1;

const TOAST_STYLE: Record<ToastType, { icon: LucideIcon; tile: string; bar: string }> = {
  success: { icon: CheckCircle2, tile: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500" },
  error: { icon: AlertCircle, tile: "bg-red-50 text-red-600", bar: "bg-red-500" },
  info: { icon: Info, tile: "bg-blue-50 text-blue-600", bar: "bg-brand" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  const success = useCallback((msg: string) => push("success", msg), [push]);
  const error = useCallback((msg: string) => push("error", msg), [push]);
  const info = useCallback((msg: string) => push("info", msg), [push]);

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      {/* Container pop-up */}
      <div className="pointer-events-none fixed right-4 top-4 z-[150] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => {
          const style = TOAST_STYLE[t.type];
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto relative flex animate-slide-in-right items-start gap-2.5 overflow-hidden rounded-2xl border border-white/80 bg-white/90 px-3 py-3 shadow-lg shadow-blue-900/15 ring-1 ring-blue-200/30 backdrop-blur-xl"
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.tile}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="flex-1 pt-0.5 text-[13px] font-medium leading-snug text-slate-700">
                {t.message}
              </p>
              <button
                onClick={() => remove(t.id)}
                className="rounded-md p-0.5 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
                aria-label="Tutup notifikasi"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <span className={`absolute bottom-0 left-0 h-0.5 w-full opacity-70 ${style.bar}`} />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam ToastProvider");
  return ctx;
}
