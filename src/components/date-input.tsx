"use client";

import { CalendarDays } from "lucide-react";
import { cn } from "@/components/ui";

// Input tanggal modern (dd/mm/yyyy mengikuti format lokal browser).
// Nilai yang dikirim/diterima tetap format ISO "YYYY-MM-DD".
export default function DateInput({
  value,
  onChange,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="date"
        aria-label={ariaLabel}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-2 text-sm text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none"
      />
    </div>
  );
}
