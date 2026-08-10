"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; type: ToastType; message: string };

const ToastContext = createContext<{
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
} | null>(null);

let nextId = 1;

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
      <div className="fixed right-4 top-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start justify-between gap-2 rounded-lg border-l-4 bg-white px-4 py-3 shadow-lg ${
              t.type === "success"
                ? "border-green-500"
                : t.type === "error"
                ? "border-red-500"
                : "border-blue-500"
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg leading-none">
                {t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"}
              </span>
              <p className="text-sm text-slate-700">{t.message}</p>
            </div>
            <button
              onClick={() => remove(t.id)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam ToastProvider");
  return ctx;
}
