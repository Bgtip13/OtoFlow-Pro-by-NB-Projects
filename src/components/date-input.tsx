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
        className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
      />
    </div>
  );
}
