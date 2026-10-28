"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-lg font-bold text-slate-800">Terjadi kendala</h1>
        <p className="mt-1 text-sm text-slate-500">
          Halaman gagal dimuat. Silakan coba lagi — data Anda tetap aman.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-slate-400">Kode: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-700"
        >
          <RotateCcw className="h-4 w-4" />
          Coba lagi
        </button>
      </div>
    </div>
  );
}
