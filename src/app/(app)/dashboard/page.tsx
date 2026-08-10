"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, todayISO } from "@/lib/format";
import { AlertTriangle, Archive, Banknote, CreditCard, Wrench } from "lucide-react";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Ringkasan aktivitas hari ini</p>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-400">Memuat...</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Link href="/laporan/omset" className="flex items-center justify-between rounded-xl bg-blue-600 p-4 text-white">
              <div>
                <div className="text-xs opacity-80">Omset Hari Ini</div>
                <div className="mt-1 text-lg font-bold">{formatRupiah(stats.omset)}</div>
              </div>
              <Banknote className="h-6 w-6 opacity-60" />
            </Link>
            <Link href="/servis" className="flex items-center justify-between rounded-xl bg-emerald-600 p-4 text-white">
              <div>
                <div className="text-xs opacity-80">Servis Aktif</div>
                <div className="mt-1 text-lg font-bold">{stats.servisAktif}</div>
              </div>
              <Wrench className="h-6 w-6 opacity-60" />
            </Link>
            <Link href="/keuangan/piutang" className="flex items-center justify-between rounded-xl bg-amber-500 p-4 text-white">
              <div>
                <div className="text-xs opacity-80">Piutang (TOP)</div>
                <div className="mt-1 text-lg font-bold">{formatRupiah(stats.piutang)}</div>
              </div>
              <CreditCard className="h-6 w-6 opacity-60" />
            </Link>
            <Link href="/database/barang" className="flex items-center justify-between rounded-xl bg-red-500 p-4 text-white">
              <div>
                <div className="text-xs opacity-80">Stok Menipis</div>
                <div className="mt-1 text-lg font-bold">{stats.stokMenipis}</div>
              </div>
              <AlertTriangle className="h-6 w-6 opacity-60" />
            </Link>
            <Link href="/database/barang" className="flex items-center justify-between rounded-xl bg-violet-600 p-4 text-white">
              <div>
                <div className="text-xs opacity-80">Stok Over</div>
                <div className="mt-1 text-lg font-bold">{stats.stokOver}</div>
              </div>
              <Archive className="h-6 w-6 opacity-60" />
            </Link>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">🟠 Stok Menipis</h3>
                <Link href="/database/barang" className="text-xs text-blue-600 hover:underline">Lihat semua →</Link>
              </div>
              {menipis.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">Tidak ada barang menipis. 👍</p>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                        <th className="px-4 py-1.5">Brand</th>
                        <th className="px-4 py-1.5">Nama Barang</th>
                        <th className="px-4 py-1.5 text-right">Stok</th>
                        <th className="px-4 py-1.5 text-right">Stok Min</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menipis.map((it) => (
                        <tr key={it.id} className="border-b border-slate-50 last:border-0">
                          <td className="px-4 py-1.5 text-slate-500">{it.brand || "-"}</td>
                          <td className="px-4 py-1.5 font-medium">{it.nama}</td>
                          <td className="px-4 py-1.5 text-right font-semibold text-red-600">{it.stok}</td>
                          <td className="px-4 py-1.5 text-right">{it.stok_min}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">📦 Stok Over</h3>
                <Link href="/database/barang" className="text-xs text-blue-600 hover:underline">Lihat semua →</Link>
              </div>
              {over.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">Tidak ada barang over stok. 👍</p>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                        <th className="px-4 py-1.5">Brand</th>
                        <th className="px-4 py-1.5">Nama Barang</th>
                        <th className="px-4 py-1.5 text-right">Stok</th>
                        <th className="px-4 py-1.5 text-right">Batas Over</th>
                      </tr>
                    </thead>
                    <tbody>
                      {over.map((it) => (
                        <tr key={it.id} className="border-b border-slate-50 last:border-0">
                          <td className="px-4 py-1.5 text-slate-500">{it.brand || "-"}</td>
                          <td className="px-4 py-1.5 font-medium">{it.nama}</td>
                          <td className="px-4 py-1.5 text-right font-semibold text-amber-600">{it.stok}</td>
                          <td className="px-4 py-1.5 text-right">{it.stok_over}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
