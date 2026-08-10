"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate, todayISO } from "@/lib/format";
import DateInput from "@/components/date-input";
import PageHeader from "@/components/page-header";
import { Banknote, Calculator, Package, TrendingUp, Wallet } from "lucide-react";

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function LabaRugiPage() {
  const supabase = createClient();
  const [from, setFrom] = useState(startOfMonth());
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
      <PageHeader icon={Calculator} title="Laporan Laba Rugi" subtitle={`Periode ${formatDate(from)} s/d ${formatDate(to)}`}>
        <div className="flex items-center gap-2">
          <DateInput value={from} onChange={setFrom} />
          <span className="text-slate-400">s/d</span>
          <DateInput value={to} onChange={setTo} />
        </div>
      </PageHeader>

      {loading || !data ? (
        <p className="mt-6 text-sm text-slate-400">Menghitung...</p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                <Banknote className="h-4 w-4 text-green-600" /> Pendapatan
              </div>
              <div className="mt-1 text-xl font-bold text-green-600">{formatRupiah(data.pendapatan.total)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                <Package className="h-4 w-4 text-slate-500" /> HPP (Harga Modal)
              </div>
              <div className="mt-1 text-xl font-bold text-slate-700">{formatRupiah(data.hpp)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                <TrendingUp className="h-4 w-4 text-blue-600" /> Laba Kotor
              </div>
              <div className="mt-1 text-xl font-bold text-blue-700">{formatRupiah(data.labaKotor)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                <Wallet className="h-4 w-4 text-green-600" /> Laba Bersih
              </div>
              <div className={`mt-1 text-xl font-bold ${data.labaBersih >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatRupiah(data.labaBersih)}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-bold text-slate-700">Pendapatan</h2>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Penjualan (lunas)</span><span>{formatRupiah(data.pendapatan.penjualan)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Servis (selesai)</span><span>{formatRupiah(data.pendapatan.servis)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Pelunasan Piutang</span><span>{formatRupiah(data.pendapatan.piutang)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold"><span>Total Pendapatan</span><span>{formatRupiah(data.pendapatan.total)}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-bold text-slate-700">Pengeluaran</h2>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Komisi Mekanik</span><span>{formatRupiah(data.pengeluaran.komisi)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Pengeluaran Lain</span><span>{formatRupiah(data.pengeluaran.lain)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold"><span>Total Pengeluaran</span><span>{formatRupiah(data.pengeluaran.total)}</span></div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-700">Perhitungan</h2>
            <div className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600"><span>Total Pendapatan</span><span>{formatRupiah(data.pendapatan.total)}</span></div>
              <div className="flex justify-between text-slate-600"><span>HPP</span><span>- {formatRupiah(data.hpp)}</span></div>
              <div className="flex justify-between font-semibold"><span>Laba Kotor</span><span>{formatRupiah(data.labaKotor)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Pengeluaran</span><span>- {formatRupiah(data.pengeluaran.total)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-800">
                <span>LABA BERSIH</span>
                <span className={data.labaBersih >= 0 ? "text-green-600" : "text-red-600"}>{formatRupiah(data.labaBersih)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
