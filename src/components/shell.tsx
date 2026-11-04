"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NavLink from "@/components/nav-link";
import RouteProgress from "@/components/route-progress";
import { createClient } from "@/lib/supabase/client";
import {
  BadgeCheck, Bike, Building2, Calculator, ChevronDown, ChevronLeft, ClipboardList, Cog,
  CreditCard, Database, Gauge, HandCoins, KeyRound, LayoutDashboard, LogOut, Menu, Package,
  PackagePlus, Receipt, Settings, ShieldCheck, ShoppingCart, TrendingUp, Truck, UserCog, Users,
  Wallet, Wrench, X, type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { title: string; icon: LucideIcon; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Kasir",
    icon: ShoppingCart,
    items: [
      { href: "/penjualan", label: "Penjualan", icon: Receipt },
      { href: "/servis", label: "Servis", icon: Wrench },
    ],
  },
  {
    title: "Stok",
    icon: Package,
    items: [
      { href: "/pembelian", label: "Pembelian", icon: PackagePlus },
      { href: "/stok-opname", label: "Stok Opname", icon: ClipboardList },
    ],
  },
  {
    title: "Database",
    icon: Database,
    items: [
      { href: "/database/barang", label: "Barang", icon: Package },
      { href: "/database/jasa", label: "Jasa", icon: Cog },
      { href: "/database/pelanggan-penjualan", label: "Pelanggan Penjualan", icon: Users },
      { href: "/database/pelanggan-servis", label: "Pelanggan Servis", icon: Bike },
      { href: "/database/mekanik", label: "Mekanik", icon: UserCog },
      { href: "/database/supplier", label: "Supplier", icon: Truck },
    ],
  },
  {
    title: "Keuangan",
    icon: Wallet,
    items: [
      { href: "/keuangan/komisi", label: "Pembayaran Komisi", icon: HandCoins },
      { href: "/keuangan/piutang", label: "Piutang (TOP)", icon: CreditCard },
      { href: "/laporan/laba-rugi", label: "Laba Rugi", icon: Calculator },
      { href: "/laporan/omset", label: "Omset Penjualan", icon: TrendingUp },
      { href: "/laporan/omset-mekanik", label: "Omset per Mekanik", icon: Gauge },
    ],
  },
  {
    title: "Pengaturan",
    icon: Settings,
    items: [
      { href: "/pengaturan/perusahaan", label: "Profil Perusahaan", icon: Building2 },
      { href: "/pengaturan/password", label: "Ganti Password", icon: KeyRound },
    ],
  },
];

const SIDEBAR_KEY = "otoflow:sidebar-collapsed";

export default function Shell({
  company,
  logoUrl,
  username,
  isAdmin,
  children,
}: {
  company: string;
  logoUrl: string;
  username: string;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [today, setToday] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  const navGroups: NavGroup[] = isAdmin
    ? [
        ...NAV_GROUPS,
        {
          title: "Panel Admin",
          icon: ShieldCheck,
          items: [{ href: "/admin/aktivasi", label: "Kode Aktivasi", icon: BadgeCheck }],
        },
      ]
    : NAV_GROUPS;

  const isActivePath = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Preferensi sidebar (desktop) diingat antar sesi
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      /* ignore */
    }
    setToday(
      new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date())
    );
  }, []);

  // Tutup drawer setiap pindah halaman
  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  // Auto-buka kategori yang sedang aktif
  useEffect(() => {
    const active = navGroups.find((g) => g.items.some((i) => isActivePath(i.href)));
    if (active) {
      setExpanded((prev) => (prev.includes(active.title) ? prev : [...prev, active.title]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleGroup(title: string) {
    setExpanded((prev) => (prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]));
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const AppLogo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={company} className="h-9 w-9 rounded-xl bg-white/90 object-contain p-0.5 shadow-sm ring-1 ring-white/30" />
  ) : (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-black text-white shadow-brand">
      OF
    </div>
  );

  const activeGroup = navGroups.find((g) => g.items.some((i) => isActivePath(i.href)));
  const activeItem = activeGroup?.items.find((i) => isActivePath(i.href));

  const groupLabel = (() => {
    if (activeGroup) return activeGroup.title;
    if (pathname.startsWith("/dashboard")) return "Ringkasan";
    return "OtoFlow";
  })();

  /* ---------------- Sidebar isi ---------------- */
  const navContent = collapsed ? (
    <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
      {navGroups.map((group) => (
        <div key={group.title} className="space-y-1">
          <div className="mx-auto my-2 h-px w-6 bg-white/10 first:hidden" />
          {group.items.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </div>
      ))}
    </nav>
  ) : (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 text-sm">
      {navGroups.map((group) => {
        const open = expanded.includes(group.title);
        const groupActive = group.items.some((i) => isActivePath(i.href));
        return (
          <div key={group.title}>
            <button
              onClick={() => toggleGroup(group.title)}
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition-colors ${
                groupActive ? "text-white" : "text-slate-300/80 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <group.icon className={`h-4 w-4 shrink-0 ${groupActive ? "text-cyan-300" : ""}`} />
                <span className="text-[13px] font-semibold tracking-wide">{group.title}</span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
                  open ? "" : "-rotate-90"
                }`}
              />
            </button>
            <div
              className={`grid transition-all duration-200 ease-out ${
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="mt-0.5 space-y-0.5 pb-1 pl-3">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      onClick={() => setDrawerOpen(false)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.05] px-2.5 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 text-[11px] font-bold uppercase text-white shadow-sm ring-1 ring-white/20">
          {username.slice(0, 2)}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-white">{username}</div>
              <div className="text-[10px] text-slate-400">
                {isAdmin ? "Administrator" : "Petugas"}
              </div>
            </div>
            {isAdmin && (
              <span className="rounded-md bg-gradient-to-r from-violet-500 to-cyan-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                Admin
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );

  const brand = (
    <>
      {AppLogo}
      {!collapsed && (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-bold tracking-tight text-white">OtoFlow Pro</div>
          <div className="text-[10px] text-blue-200/70">by NB Projects</div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen">
      <RouteProgress />

      {/* SIDEBAR DESKTOP */}
      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/10 bg-sidebar shadow-[8px_0_40px_-20px_rgba(45,30,128,0.6)] transition-[width] duration-200 md:flex ${
          collapsed ? "w-[76px]" : "w-[264px]"
        }`}
      >
        <div
          className={`flex items-center gap-2.5 border-b border-white/10 py-4 ${
            collapsed ? "justify-center px-2" : "px-4"
          }`}
        >
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            {brand}
          </Link>
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              title="Perkecil sidebar"
              className="ml-auto rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={toggleCollapsed}
            title="Perbesar sidebar"
            className="mx-auto mt-2 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
        {navContent}
        {footer}
      </aside>

      {/* DRAWER MOBILE */}
      <div
        className={`app-drawer fixed inset-0 z-40 md:hidden ${drawerOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!drawerOpen}
      >
        <div
          className={`app-drawer-overlay absolute inset-0 bg-blue-950/60 backdrop-blur-sm transition-opacity duration-200 ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          className={`app-drawer absolute inset-y-0 left-0 flex w-[276px] flex-col bg-sidebar shadow-2xl transition-transform duration-250 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              {AppLogo}
              <div>
                <div className="truncate text-[13px] font-bold text-white">OtoFlow Pro</div>
                <div className="text-[10px] text-blue-200/70">by NB Projects</div>
              </div>
            </Link>
            <button
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Tutup menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {navContent}
          {footer}
        </div>
      </div>

      <div className={`app-content transition-[padding] duration-200 ${collapsed ? "md:pl-[76px]" : "md:pl-[264px]"}`}>
        <header className="app-header sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-white/70 bg-white/65 px-4 shadow-[0_10px_30px_-24px_rgba(86,54,242,0.5)] backdrop-blur-xl md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 md:hidden"
              aria-label="Buka menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <LayoutDashboard className="h-3 w-3" />
                <span className="truncate">{groupLabel}</span>
                <span className="text-slate-300">/</span>
                <span className="truncate text-slate-500">{activeItem?.label ?? "Dashboard"}</span>
              </div>
              <div className="truncate text-[15px] font-extrabold tracking-tight text-slate-900">
                {activeItem?.label ?? "Dashboard"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-medium text-blue-900/70 ring-1 ring-blue-200/60 lg:inline">
              {today}
            </span>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 py-1 pl-1 pr-1 shadow-sm transition hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/10 sm:pr-2.5"
                aria-label="Menu akun"
              >
                {AppLogo}
                <span className="hidden max-w-[100px] truncate text-xs font-semibold text-slate-700 sm:inline">
                  {username}
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:inline" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-1.5 shadow-xl shadow-blue-900/15 backdrop-blur-xl animate-pop-in">
                    <div className="px-2.5 py-2">
                      <div className="truncate text-[13px] font-semibold text-slate-700">{username}</div>
                      <div className="truncate text-[11px] text-slate-400">{company}</div>
                    </div>
                    <div className="my-1 border-t border-slate-100" />
                    <Link
                      href="/pengaturan/perusahaan"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Building2 className="h-4 w-4 text-slate-400" />
                      Profil Perusahaan
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Keluar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="app-main mx-auto w-full max-w-[1440px] p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
