"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X, type LucideIcon } from "lucide-react";

/* ============================================================
   Utilitas
   ============================================================ */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ============================================================
   Kartu
   ============================================================ */
export function Card({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/80 bg-white/75 shadow-[0_1px_2px_rgba(45,30,128,0.05),0_18px_40px_-26px_rgba(86,54,242,0.35)] ring-1 ring-blue-200/30 backdrop-blur-xl",
        padded && "p-4 md:p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  icon: Icon,
  children,
  right,
  hint,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  right?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400/15 to-cyan-400/20 text-blue-600 ring-1 ring-inset ring-blue-200/60">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-bold uppercase tracking-wide text-slate-600">
            {children}
          </h2>
          {hint && <p className="mt-0.5 text-xs font-normal normal-case text-slate-400">{hint}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/* ============================================================
   Tombol
   ============================================================ */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-btn text-white shadow-brand hover:brightness-110 hover:shadow-[0_14px_30px_-10px_rgba(75,53,255,0.65)] focus-visible:ring-blue-500/30",
  secondary:
    "bg-blue-50/80 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 focus-visible:ring-blue-500/20",
  ghost:
    "bg-white/80 text-slate-700 border border-slate-200 backdrop-blur hover:bg-white hover:border-blue-200 hover:text-blue-700 focus-visible:ring-blue-400/20",
  danger:
    "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300 focus-visible:ring-red-500/20",
  success:
    "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-700/25 hover:brightness-110 focus-visible:ring-emerald-500/30",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
};

export function Button({
  children,
  variant = "ghost",
  size = "md",
  icon: Icon,
  className,
  loading,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-4 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
        BUTTON_SIZES[size],
        BUTTON_VARIANTS[variant],
        className
      )}
    >
      {loading ? (
        <span
          className={cn(
            "animate-spin rounded-full border-2 border-current border-t-transparent",
            size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"
          )}
        />
      ) : (
        Icon && <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      )}
      {children}
    </button>
  );
}

/* ============================================================
   Form
   ============================================================ */
export const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-[0_1px_1px_rgba(45,30,128,0.04)] placeholder:text-slate-400 transition hover:border-blue-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn(inputClass, className)} />;
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-[0_1px_1px_rgba(15,23,42,0.03)] placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none",
        className
      )}
    />
  );
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={cn(
        "h-10 rounded-xl border border-slate-200 bg-white px-3 pr-8 text-sm text-slate-800 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none",
        className
      )}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

/* ============================================================
   Badge & Stat
   ============================================================ */
type Tone = "slate" | "blue" | "green" | "amber" | "red" | "violet";

const TONES: Record<
  Tone,
  { badge: string; icon: string; value: string; bar: string; ring: string }
> = {
  slate: {
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    icon: "bg-slate-100 text-slate-500",
    value: "text-slate-800",
    bar: "from-slate-300 to-slate-400",
    ring: "group-hover:ring-slate-200",
  },
  blue: {
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
    icon: "bg-gradient-to-br from-violet-400/15 to-blue-500/15 text-blue-600",
    value: "text-slate-900",
    bar: "from-violet-500 via-blue-600 to-cyan-400",
    ring: "group-hover:ring-blue-200",
  },
  green: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: "bg-emerald-50 text-emerald-600",
    value: "text-emerald-700",
    bar: "from-emerald-400 to-emerald-600",
    ring: "group-hover:ring-emerald-200",
  },
  amber: {
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    icon: "bg-amber-50 text-amber-600",
    value: "text-amber-700",
    bar: "from-amber-400 to-amber-500",
    ring: "group-hover:ring-amber-200",
  },
  red: {
    badge: "bg-red-50 text-red-700 ring-red-200",
    icon: "bg-red-50 text-red-600",
    value: "text-red-600",
    bar: "from-red-400 to-red-600",
    ring: "group-hover:ring-red-200",
  },
  violet: {
    badge: "bg-violet-50 text-violet-700 ring-violet-200",
    icon: "bg-violet-50 text-violet-600",
    value: "text-violet-700",
    bar: "from-violet-400 to-violet-600",
    ring: "group-hover:ring-violet-200",
  },
};

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
        TONES[tone].badge,
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  hint?: string;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-3xl border border-white/80 bg-white/75 p-3.5 shadow-[0_1px_2px_rgba(45,30,128,0.05)] ring-1 ring-blue-200/30 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-18px_rgba(86,54,242,0.45)]",
        className
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r", t.bar)} />
      {Icon && (
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-transparent transition",
            t.icon,
            t.ring
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400">
          {label}
        </div>
        <div className={cn("mt-0.5 truncate text-[17px] font-bold leading-tight", t.value)}>
          {value}
        </div>
        {hint && <div className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   Tabel data
   ============================================================ */
export type TableColumn<T> = {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
  render: (row: T) => React.ReactNode;
};

const ALIGN: Record<"left" | "right" | "center", string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  loadingText = "Memuat data…",
  empty = "Belum ada data.",
  emptyIcon: EmptyIcon,
  footer,
  skeletonRows = 6,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  loadingText?: string;
  empty?: string;
  emptyIcon?: LucideIcon;
  footer?: React.ReactNode;
  skeletonRows?: number;
}) {
  return (
    <div>
      <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/80 shadow-[0_1px_2px_rgba(45,30,128,0.05),0_18px_40px_-28px_rgba(86,54,242,0.3)] ring-1 ring-blue-200/30 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-blue-100 bg-gradient-to-r from-violet-50/90 via-blue-50/70 to-cyan-50/70">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "whitespace-nowrap px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-blue-900/70",
                      ALIGN[c.align ?? "left"],
                      c.headerClassName
                    )}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: skeletonRows }).map((_, r) => (
                  <tr key={`skeleton-${r}`} className="border-b border-slate-100 last:border-0">
                    {columns.map((c, i) => (
                      <td key={c.key} className={cn("px-3 py-2.5", ALIGN[c.align ?? "left"])}>
                        <div
                          className={cn("skeleton h-3.5", c.align === "right" ? "ml-auto" : "")}
                          style={{ width: `${[70, 50, 85, 60, 55][i % 5]}%`, maxWidth: 180 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-14 text-center">
                    <div className="flex flex-col items-center gap-2.5 text-slate-400">
                      {EmptyIcon && (
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400/15 to-cyan-400/20 text-blue-500">
                          <EmptyIcon className="h-6 w-6" />
                        </span>
                      )}
                      <span className="text-sm font-medium text-slate-500">{empty}</span>
                      <span className="text-xs text-slate-400">Data akan muncul di sini.</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((row, i) => (
                  <tr
                    key={rowKey(row, i)}
                    className="border-b border-slate-100 transition-colors last:border-0 even:bg-blue-50/25 hover:bg-blue-50/70"
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-3 py-2.5 align-middle text-slate-600",
                          ALIGN[c.align ?? "left"],
                          c.className
                        )}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="border-t border-slate-100 px-3 py-2 text-center text-[11px] text-slate-400">
            {loadingText}
          </div>
        )}
      </div>
      {footer}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-slate-500">
        Halaman <b className="text-slate-700">{page + 1}</b> dari{" "}
        <b className="text-slate-700">{totalPages}</b>
        <span className="mx-1.5 text-slate-300">·</span>
        {total} data
      </span>
      <div className="flex gap-2">
        <Button size="sm" disabled={page === 0} onClick={() => onChange(page - 1)}>
          ← Sebelumnya
        </Button>
        <Button size="sm" disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>
          Berikutnya →
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
   Modal
   ============================================================ */
export function PageModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-blue-950/45 p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-2xl shadow-blue-900/30 backdrop-blur-xl animate-pop-in",
          maxWidth
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold tracking-tight text-slate-800">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-blue-100/70 bg-blue-50/40 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Aksi baris tabel
   ============================================================ */
export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-1">{children}</div>;
}

export function RowAction({
  children,
  icon: Icon,
  onClick,
  href,
  tone = "slate",
}: {
  children: React.ReactNode;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  tone?: "blue" | "slate" | "red" | "green";
}) {
  const toneCls =
    tone === "blue"
      ? "text-blue-600 hover:bg-blue-50"
      : tone === "red"
      ? "text-red-600 hover:bg-red-50"
      : tone === "green"
      ? "text-emerald-600 hover:bg-emerald-50"
      : "text-slate-600 hover:bg-slate-100";

  const cls = cn(
    "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors",
    toneCls
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
