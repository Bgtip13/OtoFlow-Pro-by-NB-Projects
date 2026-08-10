"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NavLink from "@/components/nav-link";
import { createClient } from "@/lib/supabase/client";
import {
  BadgeCheck, Bike, Building2, Calculator, ChevronDown, ChevronRight, ClipboardList, Cog,
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

  // Auto-buka kategori yang sedang aktif
  useEffect(() => {
    const active = navGroups.find((g) =>
      g.items.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    );
    if (active && !expanded.includes(active.title)) {
      setExpanded((prev) => [...prev, active.title]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleGroup(title: string) {
    setExpanded((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const AppLogo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={company} className="h-8 w-8 rounded object-contain" />
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-sm font-bold text-white">OF</div>
  );

  const navContent = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 text-sm">
      {navGroups.map((group) => {
        const open = expanded.includes(group.title);
        return (
          <div key={group.title}>
            <button
              onClick={() => toggleGroup(group.title)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <group.icon className="h-4 w-4 shrink-0" />
                <span className="font-medium">{group.title}</span>
              </span>
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            {open && (
              <div className="mt-0.5 space-y-0.5 pl-4">
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
    <div className="border-t border-slate-700 p-3">
      <div className="text-xs text-slate-400">Masuk sebagai</div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{username}</span>
        {isAdmin && (
          <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">ADMIN</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {/* SIDEBAR DESKTOP */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-slate-900 md:flex">
        <Link href="/dashboard" className="flex items-center gap-2 border-b border-slate-700 px-4 py-4">
          {AppLogo}
          <div>
            <div className="text-sm font-bold text-white">OtoFlow Pro</div>
            <div className="text-[10px] text-slate-400">by NB Projects</div>
          </div>
        </Link>
        {navContent}
        {footer}
      </aside>

      {/* DRAWER MOBILE */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-60 flex-col bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-4">
              <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setDrawerOpen(false)}>
                {AppLogo}
                <div>
                  <div className="text-sm font-bold text-white">OtoFlow Pro</div>
                  <div className="text-[10px] text-slate-400">by NB Projects</div>
                </div>
              </Link>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
            {footer}
          </div>
        </div>
      )}

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawerOpen(true)} className="text-slate-600 md:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <div className="text-sm font-bold text-slate-800">{company}</div>
              <div className="text-[10px] text-slate-400">OtoFlow Pro by NB Projects</div>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-200"
            >
              {AppLogo}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <div className="px-2 py-1 text-sm font-semibold text-slate-700">{username}</div>
                <div className="mb-1 px-2 text-xs text-slate-400">{company}</div>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
