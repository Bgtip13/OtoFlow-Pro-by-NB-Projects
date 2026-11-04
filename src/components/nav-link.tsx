"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export default function NavLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-all duration-150 ${
        active
          ? "bg-brand-btn font-semibold text-white shadow-brand ring-1 ring-inset ring-white/20"
          : "text-slate-300/80 hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      {Icon && (
        <Icon
          className={`h-4 w-4 shrink-0 transition-colors ${
            active ? "text-white" : "text-slate-400 group-hover:text-cyan-300"
          }`}
        />
      )}
      <span className="truncate">{label}</span>
    </Link>
  );
}
