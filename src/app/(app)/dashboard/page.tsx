"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, todayISO } from "@/lib/format";
import PageHeader from "@/components/page-header";
import { Badge, Card, CardTitle, StatCard } from "@/components/ui";
import {
  AlertTriangle, Archive, ArrowUpRight, Banknote, CreditCard, LayoutDashboard,
  PackagePlus, Receipt, Wallet, Wrench,
} from "lucide-react";

type Item = { id: string; kode: string; brand: string; nama: string; stok: number; stok_min: number; stok_over: number };

const QUICK_ACTIONS = [
  { href: "/penjualan/baru", label: "Nota Penjualan", icon: Receipt, tone: "bg-blue-50 text-blue-600" },
  { href: "/servis/baru", label: "Nota Servis", icon: Wrench, tone: "bg-emerald-50 text-emerald-600" },
  { href: "/pembelian/baru", label: "Barang Masuk", icon: PackagePlus, tone: "bg-violet-50 text-violet-600" },
  { href: "/keuangan/piutang", label: "Piutang", icon: CreditCard, tone: "bg-amber-50 text-amber-600" },
];

export default function DashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState({ omset: 0, servisAktif: 0, piutang: 0, stokMenipis: 0, stokOver: 0 });
  const [menipis, setMenipis] = useState<Item[]>([]);
  const [over, setOver] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = todayISO();

      const [omsetRes, srvRes, piuRes, lowRes, overRes, summRes] = await Promise.all([
        supabase.from("ledgers").select("jumlah").eq("tipe", "masuk").eq("tanggal", today),
        supabase.from("service_invoices").select("id", { count: "exact", head: true }).eq("status", "pengerjaan"),
        supabase.from("receivables").select("total, paid").neq("status", "lunas"),
        supabase.rpc("get_low_stock", { limit_n: 10 }),
        supabase.rpc("get_over_stock", { limit_n: 10 }),
        supabase.rpc("stock_summary"),
      ]);

      const omset = (omsetRes.data ?? []).reduce((s: number, r: any) => s + r.jumlah, 0);
      const piutang = (piuRes.data ?? []).reduce((s: number, r: any) => s + (r.total - r.paid), 0);
      const summ = summRes.data as { low_count: number; over_count: number } | null;

      setStats({
        omset,
        servisAktif: srvRes.count ?? 0,
        piutang,
        stokMenipis: summ?.low_count ?? 0,
        stokOver: summ?.over_count ?? 0,
      });
      setMenipis((lowRes.data ?? []) as Item[]);
      setOver((overRes.data ?? []) as Item[]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        subtitle="Ringkasan aktivitas bengkel hari ini"
        badge={<Badge tone="green">Live</Badge>}
      />

      {/* Aksi cepat */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5"
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${a.tone}`}>
              <a.icon className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-700">
              {a.label}
            </span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:text-blue-500" />
          </Link>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-[76px] rounded-2xl" />)
        ) : (
          <>
            <Link href="/laporan/omset">
              <StatCard label="Omset Hari Ini" value={formatRupiah(stats.omset)} icon={Banknote} tone="blue" />
            </Link>
            <Link href="/servis">
              <StatCard label="Servis Aktif" value={stats.servisAktif} icon={Wrench} tone="green" hint="Status pengerjaan" />
            </Link>
            <Link href="/keuangan/piutang">
              <StatCard label="Piutang (TOP)" value={formatRupiah(stats.piutang)} icon={Wallet} tone="amber" />
            </Link>
            <Link href="/database/barang">
              <StatCard label="Stok Menipis" value={stats.stokMenipis} icon={AlertTriangle} tone="red" />
            </Link>
            <Link href="/database/barang">
              <StatCard label="Stok Over" value={stats.stokOver} icon={Archive} tone="violet" />
            </Link>
          </>
        )}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardTitle
            icon={AlertTriangle}
            right={
              <Link href="/database/barang" className="text-xs font-semibold text-blue-600 hover:underline">
                Lihat semua →
              </Link>
            }
          >
            Stok Menipis
          </CardTitle>

          {loading ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-8" />)}
            </div>
          ) : menipis.length === 0 ? (
            <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-8 text-center text-sm font-medium text-emerald-600">
              Tidak ada barang menipis 👍
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10.5px] uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3 font-semibold">Brand</th>
                    <th className="py-2 pr-3 font-semibold">Nama Barang</th>
                    <th className="py-2 pr-3 text-right font-semibold">Stok</th>
                    <th className="py-2 text-right font-semibold">Min</th>
                  </tr>
                </thead>
                <tbody>
                  {menipis.map((it) => (
                    <tr key={it.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pr-3 text-slate-500">{it.brand || "-"}</td>
                      <td className="py-2 pr-3 font-medium text-slate-700">{it.nama}</td>
                      <td className="py-2 pr-3 text-right"><Badge tone="red">{it.stok}</Badge></td>
                      <td className="py-2 text-right text-slate-500">{it.stok_min}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle
            icon={Archive}
            right={
              <Link href="/database/barang" className="text-xs font-semibold text-blue-600 hover:underline">
                Lihat semua →
              </Link>
            }
          >
            Stok Over
          </CardTitle>

          {loading ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-8" />)}
            </div>
          ) : over.length === 0 ? (
            <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-8 text-center text-sm font-medium text-emerald-600">
              Tidak ada barang over stok 👍
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10.5px] uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3 font-semibold">Brand</th>
                    <th className="py-2 pr-3 font-semibold">Nama Barang</th>
                    <th className="py-2 pr-3 text-right font-semibold">Stok</th>
                    <th className="py-2 text-right font-semibold">Batas</th>
                  </tr>
                </thead>
                <tbody>
                  {over.map((it) => (
                    <tr key={it.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pr-3 text-slate-500">{it.brand || "-"}</td>
                      <td className="py-2 pr-3 font-medium text-slate-700">{it.nama}</td>
                      <td className="py-2 pr-3 text-right"><Badge tone="amber">{it.stok}</Badge></td>
                      <td className="py-2 text-right text-slate-500">{it.stok_over}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
