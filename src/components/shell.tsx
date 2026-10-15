"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NavLink from "@/components/nav-link";
import { createClient } from "@/lib/supabase/client";
import {
  BadgeCheck, Bike, Building2, Calculator, ChevronDown, ClipboardList, Cog,
  CreditCard, Database, Gauge, HandCoins, KeyRound, LogOut, Menu, Package, PackagePlus,
  Receipt, Settings, ShieldCheck, ShoppingCart, TrendingUp, Truck, UserCog, Users, Wallet,
  Wrench, X, type LucideIcon,
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
  const [expanded, setExpanded] = useState<string[]>([]);
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

  // Auto-buka kategori yang sedang aktif
  useEffect(() => {
    const active = navGroups.find((g) => g.items.some((i) => isActivePath(i.href)));
    if (active && !expanded.includes(active.title)) {
      setExpanded((prev) => [...prev, active.title]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleGroup(title: string) {
    setExpanded((prev) => (prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]));
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const AppLogo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={company} className="h-9 w-9 rounded-xl object-contain" />
  ) : (
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white">
      OF
    </div>
  );

  const activeGroup = navGroups.find((g) => g.items.some((i) => isActivePath(i.href)));
  const activeItem = activeGroup?.items.find((i) => isActivePath(i.href));

  const navContent = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 text-sm">
      {navGroups.map((group) => {
        const open = expanded.includes(group.title);
        const groupActive = group.items.some((i) => isActivePath(i.href));
        return (
          <div key={group.title}>
            <button
              onClick={() => toggleGroup(group.title)}
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition-colors ${
                groupActive ? "text-white" : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <group.icon className={`h-4 w-4 shrink-0 ${groupActive ? "text-blue-400" : ""}`} />
                <span className="font-medium">{group.title}</span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "" : "-rotate-90"}`} />
            </button>
            {open && (
              <div className="mt-0.5 space-y-0.5 pl-3">
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
            )}
          </div>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-slate-800 p-3">
      <div className="flex items-center gap-2.5 rounded-xl bg-slate-800/60 px-2.5 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-xs font-bold uppercase text-slate-200">
          {username.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{username}</div>
          <div className="text-[10px] text-slate-400">{isAdmin ? "Administrator" : "Petugas"}</div>
        </div>
        {isAdmin && (
          <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Admin</span>
        )}
      </div>
    </div>
  );

  const brand = (
    <>
      {AppLogo}
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-white">OtoFlow Pro</div>
        <div className="text-[10px] text-slate-400">by NB Projects</div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* SIDEBAR DESKTOP */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800 bg-slate-900 md:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 border-b border-slate-800 px-4 py-4">
          {brand}
        </Link>
        {navContent}
        {footer}
      </aside>

      {/* DRAWER MOBILE */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
              <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setDrawerOpen(false)}>
                {brand}
              </Link>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
            {footer}
          </div>
        </div>
      )}

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setDrawerOpen(true)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 md:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="truncate">{company}</span>
              </div>
              <div className="truncate text-sm font-semibold text-slate-800">
                {activeItem?.label ?? "Dashboard"}
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
            >
              {AppLogo}
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  <div className="px-2.5 py-2">
                    <div className="truncate text-sm font-semibold text-slate-700">{username}</div>
                    <div className="truncate text-xs text-slate-400">{company}</div>
                  </div>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
