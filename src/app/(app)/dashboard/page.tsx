"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, todayISO } from "@/lib/format";
import PageHeader from "@/components/page-header";
import { Badge, Card, CardTitle, StatCard } from "@/components/ui";
import { AlertTriangle, Archive, Banknote, CreditCard, LayoutDashboard, Wrench } from "lucide-react";

type Item = { id: string; kode: string; brand: string; nama: string; stok: number; stok_min: number; stok_over: number };

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
      <PageHeader icon={LayoutDashboard} title="Dashboard" subtitle="Ringkasan aktivitas hari ini" />

      {loading ? (
        <p className="mt-6 text-sm text-slate-400">Memuat...</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <Link href="/laporan/omset" className="transition hover:-translate-y-0.5">
              <StatCard label="Omset Hari Ini" value={formatRupiah(stats.omset)} icon={Banknote} tone="blue" />
            </Link>
            <Link href="/servis" className="transition hover:-translate-y-0.5">
              <StatCard label="Servis Aktif" value={stats.servisAktif} icon={Wrench} tone="green" />
            </Link>
            <Link href="/keuangan/piutang" className="transition hover:-translate-y-0.5">
              <StatCard label="Piutang (TOP)" value={formatRupiah(stats.piutang)} icon={CreditCard} tone="amber" />
            </Link>
            <Link href="/database/barang" className="transition hover:-translate-y-0.5">
              <StatCard label="Stok Menipis" value={stats.stokMenipis} icon={AlertTriangle} tone="red" />
            </Link>
            <Link href="/database/barang" className="transition hover:-translate-y-0.5">
              <StatCard label="Stok Over" value={stats.stokOver} icon={Archive} tone="violet" />
            </Link>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
              {menipis.length === 0 ? (
                <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-6 text-center text-sm text-emerald-600">
                  Tidak ada barang menipis 👍
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
                        <th className="py-2 pr-3">Brand</th>
                        <th className="py-2 pr-3">Nama Barang</th>
                        <th className="py-2 pr-3 text-right">Stok</th>
                        <th className="py-2 text-right">Stok Min</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menipis.map((it) => (
                        <tr key={it.id} className="border-b border-slate-50 last:border-0">
                          <td className="py-2 pr-3 text-slate-500">{it.brand || "-"}</td>
                          <td className="py-2 pr-3 font-medium text-slate-700">{it.nama}</td>
                          <td className="py-2 pr-3 text-right">
                            <Badge tone="red">{it.stok}</Badge>
                          </td>
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
              {over.length === 0 ? (
                <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-6 text-center text-sm text-emerald-600">
                  Tidak ada barang over stok 👍
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
                        <th className="py-2 pr-3">Brand</th>
                        <th className="py-2 pr-3">Nama Barang</th>
                        <th className="py-2 pr-3 text-right">Stok</th>
                        <th className="py-2 text-right">Batas Over</th>
                      </tr>
                    </thead>
                    <tbody>
                      {over.map((it) => (
                        <tr key={it.id} className="border-b border-slate-50 last:border-0">
                          <td className="py-2 pr-3 text-slate-500">{it.brand || "-"}</td>
                          <td className="py-2 pr-3 font-medium text-slate-700">{it.nama}</td>
                          <td className="py-2 pr-3 text-right">
                            <Badge tone="amber">{it.stok}</Badge>
                          </td>
                          <td className="py-2 text-right text-slate-500">{it.stok_over}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
