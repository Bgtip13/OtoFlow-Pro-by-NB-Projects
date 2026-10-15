"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate } from "@/lib/format";
import PageHeader from "@/components/page-header";
import { FilterBar, PeriodFilter, startOfMonthISO, todayISO } from "@/components/filter-bar";
import { Card, CardTitle, StatCard } from "@/components/ui";
import { Banknote, Calculator, Package, TrendingUp, Wallet } from "lucide-react";

export default function LabaRugiPage() {
  const supabase = createClient();
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  async function load() {
    setLoading(true);

    const [masuk, keluar, si, svi] = await Promise.all([
      supabase.from("ledgers").select("kategori, jumlah").eq("tipe", "masuk").gte("tanggal", from).lte("tanggal", to),
      supabase.from("ledgers").select("kategori, jumlah").eq("tipe", "keluar").gte("tanggal", from).lte("tanggal", to),
      supabase.from("sales_invoices").select("id").gte("tanggal", from).lte("tanggal", to),
      supabase.from("service_invoices").select("id").gte("tanggal", from).lte("tanggal", to),
    ]);

    let hpp = 0;
    if (si.data && si.data.length > 0) {
      const { data: det } = await supabase
        .from("invoice_details")
        .select("qty, hpp_tercatat")
        .eq("invoice_type", "penjualan")
        .in("invoice_id", si.data.map((x: any) => x.id));
      hpp += (det ?? []).reduce((s: number, d: any) => s + d.qty * d.hpp_tercatat, 0);
    }
    if (svi.data && svi.data.length > 0) {
      const { data: det } = await supabase
        .from("invoice_details")
        .select("qty, hpp_tercatat")
        .eq("invoice_type", "servis")
        .in("invoice_id", svi.data.map((x: any) => x.id));
      hpp += (det ?? []).reduce((s: number, d: any) => s + d.qty * d.hpp_tercatat, 0);
    }

    const masukRows = masuk.data ?? [];
    const keluarRows = keluar.data ?? [];
    const sum = (rows: any[], kategori?: string) =>
      rows.filter((r: any) => !kategori || r.kategori === kategori).reduce((s: number, r: any) => s + r.jumlah, 0);

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
      <PageHeader icon={Calculator} title="Laporan Laba Rugi" subtitle={`Periode ${formatDate(from)} s/d ${formatDate(to)}`} />

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
        <p className="mt-6 text-sm text-slate-400">Menghitung...</p>
      ) : (
        <div className="mt-4 space-y-4">
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

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardTitle icon={Banknote}>Pendapatan</CardTitle>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Penjualan (lunas)</span><span className="font-medium text-slate-800">{formatRupiah(data.pendapatan.penjualan)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Servis (selesai)</span><span className="font-medium text-slate-800">{formatRupiah(data.pendapatan.servis)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Pelunasan Piutang</span><span className="font-medium text-slate-800">{formatRupiah(data.pendapatan.piutang)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-800"><span>Total Pendapatan</span><span>{formatRupiah(data.pendapatan.total)}</span></div>
              </div>
            </Card>

            <Card>
              <CardTitle icon={Wallet}>Pengeluaran</CardTitle>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Komisi Mekanik</span><span className="font-medium text-slate-800">{formatRupiah(data.pengeluaran.komisi)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Pengeluaran Lain</span><span className="font-medium text-slate-800">{formatRupiah(data.pengeluaran.lain)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-800"><span>Total Pengeluaran</span><span>{formatRupiah(data.pengeluaran.total)}</span></div>
              </div>
            </Card>
          </div>

          <Card>
            <CardTitle icon={Calculator}>Perhitungan</CardTitle>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600"><span>Total Pendapatan</span><span>{formatRupiah(data.pendapatan.total)}</span></div>
              <div className="flex justify-between text-slate-600"><span>HPP</span><span>- {formatRupiah(data.hpp)}</span></div>
              <div className="flex justify-between font-semibold text-slate-800"><span>Laba Kotor</span><span>{formatRupiah(data.labaKotor)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Pengeluaran</span><span>- {formatRupiah(data.pengeluaran.total)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-800">
                <span>LABA BERSIH</span>
                <span className={data.labaBersih >= 0 ? "text-emerald-600" : "text-red-600"}>{formatRupiah(data.labaBersih)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
