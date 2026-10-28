"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate } from "@/lib/format";
import { chunk } from "@/lib/async";
import { useRequestGuard } from "@/lib/hooks";
import PageHeader from "@/components/page-header";
import { FilterBar, PeriodFilter, startOfMonthISO, todayISO } from "@/components/filter-bar";
import { Card, CardTitle, StatCard } from "@/components/ui";
import { Banknote, Calculator, Package, TrendingUp, Wallet } from "lucide-react";

type Summary = {
  pendapatan: { penjualan: number; servis: number; piutang: number; total: number };
  hpp: number;
  pengeluaran: { komisi: number; lain: number; total: number };
  labaKotor: number;
  labaBersih: number;
};

export default function LabaRugiPage() {
  const supabase = createClient();
  const guard = useRequestGuard();

  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Summary | null>(null);

  /** HPP dihitung per potongan id agar URL query tidak melebihi batas. */
  async function sumHpp(type: "penjualan" | "servis", ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const results = await Promise.all(
      chunk(ids, 400).map((batch) =>
        supabase
          .from("invoice_details")
          .select("qty, hpp_tercatat")
          .eq("invoice_type", type)
          .in("invoice_id", batch)
      )
    );
    return results.reduce(
      (total, res) => total + (res.data ?? []).reduce((s: number, d: any) => s + d.qty * d.hpp_tercatat, 0),
      0
    );
  }

  async function load() {
    const requestId = guard.next();
    setLoading(true);

    const [masuk, keluar, si, svi] = await Promise.all([
      supabase.from("ledgers").select("kategori, jumlah").eq("tipe", "masuk").gte("tanggal", from).lte("tanggal", to),
      supabase.from("ledgers").select("kategori, jumlah").eq("tipe", "keluar").gte("tanggal", from).lte("tanggal", to),
      supabase.from("sales_invoices").select("id").gte("tanggal", from).lte("tanggal", to),
      supabase.from("service_invoices").select("id").gte("tanggal", from).lte("tanggal", to),
    ]);

    const [hppSales, hppService] = await Promise.all([
      sumHpp("penjualan", (si.data ?? []).map((x: any) => x.id)),
      sumHpp("servis", (svi.data ?? []).map((x: any) => x.id)),
    ]);

    if (!guard.isCurrent(requestId)) return;

    const hpp = hppSales + hppService;
    const masukRows = masuk.data ?? [];
    const keluarRows = keluar.data ?? [];
    const sum = (rows: any[], kategori?: string) =>
      rows.filter((r) => !kategori || r.kategori === kategori).reduce((s, r) => s + r.jumlah, 0);

    const pendapatan = {
      penjualan: sum(masukRows, "penjualan"),
      servis: sum(masukRows, "servis"),
      piutang: sum(masukRows, "piutang"),
      total: sum(masukRows),
    };
    const pengeluaran = {
      komisi: sum(keluarRows, "komisi"),
      lain: sum(keluarRows) - sum(keluarRows, "komisi"),
      total: sum(keluarRows),
    };
    const labaKotor = pendapatan.total - hpp;
    const labaBersih = labaKotor - pengeluaran.total;

    setData({ pendapatan, hpp, pengeluaran, labaKotor, labaBersih });
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  return (
    <div>
      <PageHeader
        icon={Calculator}
        title="Laporan Laba Rugi"
        subtitle={`Periode ${formatDate(from)} s/d ${formatDate(to)}`}
      />

      <FilterBar>
        <PeriodFilter
          from={from}
          to={to}
          onChange={(f, t) => {
            setFrom(f);
            setTo(t);
          }}
        />
      </FilterBar>

      {loading || !data ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-[76px] rounded-2xl" />
            ))}
          </div>
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      ) : (
        <div className="animate-fade-in mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Pendapatan" value={formatRupiah(data.pendapatan.total)} icon={Banknote} tone="green" />
            <StatCard label="HPP (Harga Modal)" value={formatRupiah(data.hpp)} icon={Package} tone="slate" />
            <StatCard label="Laba Kotor" value={formatRupiah(data.labaKotor)} icon={TrendingUp} tone="blue" />
            <StatCard
              label="Laba Bersih"
              value={formatRupiah(data.labaBersih)}
              icon={Wallet}
              tone={data.labaBersih >= 0 ? "green" : "red"}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardTitle icon={Banknote}>Rincian Pendapatan</CardTitle>
              <div className="mt-3 space-y-2 text-[13px]">
                <div className="flex justify-between"><span className="text-slate-500">Penjualan (lunas)</span><span className="font-medium text-slate-800">{formatRupiah(data.pendapatan.penjualan)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Servis (selesai)</span><span className="font-medium text-slate-800">{formatRupiah(data.pendapatan.servis)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Pelunasan Piutang</span><span className="font-medium text-slate-800">{formatRupiah(data.pendapatan.piutang)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-800"><span>Total Pendapatan</span><span>{formatRupiah(data.pendapatan.total)}</span></div>
              </div>
            </Card>

            <Card>
              <CardTitle icon={Wallet}>Rincian Pengeluaran</CardTitle>
              <div className="mt-3 space-y-2 text-[13px]">
                <div className="flex justify-between"><span className="text-slate-500">Komisi Mekanik</span><span className="font-medium text-slate-800">{formatRupiah(data.pengeluaran.komisi)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Pengeluaran Lain</span><span className="font-medium text-slate-800">{formatRupiah(data.pengeluaran.lain)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-800"><span>Total Pengeluaran</span><span>{formatRupiah(data.pengeluaran.total)}</span></div>
              </div>
            </Card>
          </div>

          <Card>
            <CardTitle icon={Calculator} hint="Dihitung otomatis dari jurnal & detail nota">
              Perhitungan Laba
            </CardTitle>
            <div className="mt-3 space-y-2 text-[13px]">
              <div className="flex justify-between text-slate-500"><span>Total Pendapatan</span><span className="text-slate-800">{formatRupiah(data.pendapatan.total)}</span></div>
              <div className="flex justify-between text-slate-500"><span>HPP</span><span className="text-slate-800">- {formatRupiah(data.hpp)}</span></div>
              <div className="flex justify-between font-semibold text-slate-800"><span>Laba Kotor</span><span>{formatRupiah(data.labaKotor)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Pengeluaran</span><span className="text-slate-800">- {formatRupiah(data.pengeluaran.total)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-800">
                <span>LABA BERSIH</span>
                <span className={data.labaBersih >= 0 ? "text-emerald-600" : "text-red-600"}>
                  {formatRupiah(data.labaBersih)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
