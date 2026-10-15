"use client";

import Link from "next/link";
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
        "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]",
        padded && "p-4 md:p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ icon: Icon, children, right }: { icon?: LucideIcon; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
        {children}
      </h2>
      {right}
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
    "bg-blue-600 text-white shadow-sm shadow-blue-600/25 hover:bg-blue-700 focus-visible:ring-blue-500/30",
  secondary:
    "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 focus-visible:ring-blue-500/20",
  ghost:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400/20",
  danger:
    "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 focus-visible:ring-red-500/20",
  success:
    "bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 hover:bg-emerald-700 focus-visible:ring-emerald-500/30",
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
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
}) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl font-semibold transition-colors focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50",
        BUTTON_SIZES[size],
        BUTTON_VARIANTS[variant],
        className
      )}
    >
      {Icon && <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />}
      {children}
    </button>
  );
}

/* ============================================================
   Form
   ============================================================ */
export const inputClass =
  "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none disabled:bg-slate-50";

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn(inputClass, className)} />;
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={cn(
        "h-10 rounded-xl border border-slate-300 bg-white px-3 pr-8 text-sm text-slate-700 transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none",
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

const TONES: Record<Tone, { badge: string; icon: string; value: string }> = {
  slate: { badge: "bg-slate-100 text-slate-600 ring-slate-200", icon: "bg-slate-100 text-slate-500", value: "text-slate-800" },
  blue: { badge: "bg-blue-100 text-blue-700 ring-blue-200", icon: "bg-blue-100 text-blue-600", value: "text-blue-700" },
  green: { badge: "bg-emerald-100 text-emerald-700 ring-emerald-200", icon: "bg-emerald-100 text-emerald-600", value: "text-emerald-700" },
  amber: { badge: "bg-amber-100 text-amber-700 ring-amber-200", icon: "bg-amber-100 text-amber-600", value: "text-amber-700" },
  red: { badge: "bg-red-100 text-red-700 ring-red-200", icon: "bg-red-100 text-red-600", value: "text-red-700" },
  violet: { badge: "bg-violet-100 text-violet-700 ring-violet-200", icon: "bg-violet-100 text-violet-600", value: "text-violet-700" },
};

export function Badge({ children, tone = "slate", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
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
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03]",
        className
      )}
    >
      {Icon && (
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONES[tone].icon)}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
        <div className={cn("mt-0.5 truncate text-lg font-bold", TONES[tone].value)}>{value}</div>
        {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
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
  loadingText = "Memuat...",
  empty = "Belum ada data.",
  emptyIcon: EmptyIcon,
  footer,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  loadingText?: string;
  empty?: string;
  emptyIcon?: LucideIcon;
  footer?: React.ReactNode;
}) {
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500",
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
              {loading && (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-10 text-center text-slate-400">
                    {loadingText}
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      {EmptyIcon && <EmptyIcon className="h-8 w-8 opacity-50" />}
                      <span className="text-sm">{empty}</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row, i) => (
                  <tr
                    key={rowKey(row, i)}
                    className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70"
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-3 py-2 align-middle text-slate-700", ALIGN[c.align ?? "left"], c.className)}>
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
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
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-slate-500">
        Halaman <b className="text-slate-700">{page + 1}</b> dari <b className="text-slate-700">{totalPages}</b> · {total} data
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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className={cn("flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl", maxWidth)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</div>}
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
