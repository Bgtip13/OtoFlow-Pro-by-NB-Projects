"use client";

import { useMemo, useState } from "react";
import { Search, type LucideIcon } from "lucide-react";
import DateInput from "@/components/date-input";
import { cn } from "@/components/ui";

/* ============================================================
   Utilitas tanggal
   ============================================================ */
export function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function todayISO() {
  return toISO(new Date());
}
export function startOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export type Period = "today" | "week" | "month" | "year";

export const PERIOD_LABELS: Record<Period, string> = {
  today: "Hari Ini",
  week: "Minggu Ini",
  month: "Bulan Ini",
  year: "Tahun Ini",
};

export function periodRange(p: Period): { from: string; to: string } {
  const d = new Date();
  if (p === "today") return { from: todayISO(), to: todayISO() };
  if (p === "week") {
    const f = new Date();
    f.setDate(d.getDate() - 6);
    return { from: toISO(f), to: todayISO() };
  }
  if (p === "year") return { from: `${d.getFullYear()}-01-01`, to: todayISO() };
  return { from: startOfMonthISO(), to: todayISO() };
}

/* ============================================================
   Kerangka filter
   ============================================================ */
export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/90 p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FilterSpacer() {
  return <div className="ml-auto" />;
}

/* ============================================================
   Filter periode: preset + rentang tanggal
   ============================================================ */
export function PeriodFilter({
  from,
  to,
  onChange,
  presets = ["today", "week", "month"],
  className,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  presets?: Period[];
  className?: string;
}) {
  const [rangeFor] = useState(() => presets.map((p) => ({ p, ...periodRange(p) })));

  function setRange(p: Period) {
    const r = periodRange(p);
    onChange(r.from, r.to);
  }

  function setFrom(v: string) {
    if (!v) return;
    onChange(v, to && v > to ? v : to);
  }
  function setTo(v: string) {
    if (!v) return;
    onChange(from && v < from ? v : from, v);
  }

  const active = useMemo(
    () => rangeFor.find((r) => r.from === from && r.to === to)?.p,
    [from, to, rangeFor]
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex items-center gap-0.5 rounded-xl bg-slate-100 p-1">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setRange(p)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              active === p
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <DateInput value={from} onChange={setFrom} className="w-[9.5rem]" ariaLabel="Tanggal mulai" />
        <span className="px-0.5 text-xs text-slate-400">s/d</span>
        <DateInput value={to} onChange={setTo} className="w-[9.5rem]" ariaLabel="Tanggal akhir" />
      </div>
    </div>
  );
}

/* ============================================================
   Pencarian
   ============================================================ */
export function SearchInput({
  value,
  onChange,
  placeholder = "Cari...",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:w-72", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-800 shadow-[0_1px_1px_rgba(15,23,42,0.03)] placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Hapus pencarian"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1 text-slate-300 transition hover:text-slate-500"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/* ============================================================
   Dropdown filter
   ============================================================ */
export function SelectFilter<T extends string>({
  value,
  onChange,
  options,
  icon: Icon,
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  icon?: LucideIcon;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          "h-10 appearance-none rounded-xl border border-slate-200 bg-white pr-8 text-sm font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none",
          Icon ? "pl-9" : "pl-3"
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
