"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate, todayISO } from "@/lib/format";
import DateInput from "@/components/date-input";
import PageHeader from "@/components/page-header";
import { Banknote, TrendingUp } from "lucide-react";

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const kategoriLabel: Record<string, string> = {
  penjualan: "Penjualan",
  servis: "Servis",
  piutang: "Pelunasan Piutang",
};

export default function OmsetPage() {
  const supabase = createClient();
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});

  function setQuick(period: "today" | "week" | "month") {
    const d = new Date();
    if (period === "today") {
      setFrom(todayISO());
      setTo(todayISO());
    } else if (period === "week") {
      const f = new Date();
      f.setDate(d.getDate() - 6);
      setFrom(toISO(f));
      setTo(todayISO());
    } else {
      setFrom(startOfMonth());
      setTo(todayISO());
    }
  }

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("ledgers")
      .select("*")
      .eq("tipe", "masuk")
      .gte("tanggal", from)
      .lte("tanggal", to)
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false });
    setRows(data ?? []);
    const s: Record<string, number> = {};
    for (const r of data ?? []) s[r.kategori] = (s[r.kategori] || 0) + r.jumlah;
    setSummary(s);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const total = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader icon={TrendingUp} title="Omset Penjualan" subtitle={`Periode ${formatDate(from)} s/d ${formatDate(to)}`}>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setQuick("today")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Hari Ini</button>
          <button onClick={() => setQuick("week")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Minggu Ini</button>
          <button onClick={() => setQuick("month")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Bulan Ini</button>
          <DateInput value={from} onChange={setFrom} />
          <span className="text-slate-400">s/d</span>
          <DateInput value={to} onChange={setTo} />
        </div>
      </PageHeader>

      {loading ? (
        <p className="mt-6 text-sm text-slate-400">Memuat...</p>
      ) : (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                <Banknote className="h-4 w-4 text-blue-600" /> Total Omset
              </div>
              <div className="mt-1 text-xl font-bold text-blue-700">{formatRupiah(total)}</div>
            </div>
            {Object.entries(kategoriLabel).map(([k, label]) => (
              <div key={k} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase text-slate-400">{label}</div>
                <div className="mt-1 text-xl font-bold text-slate-700">{formatRupiah(summary[k] || 0)}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">Tanggal</th>
                  <th className="px-2 py-1.5">Keterangan</th>
                  <th className="px-2 py-1.5">Kategori</th>
                  <th className="px-2 py-1.5 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={4} className="px-2 py-4 text-center text-slate-400">Tidak ada transaksi.</td></tr>
                )}
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-2 py-1">{formatDate(r.tanggal)}</td>
                    <td className="px-2 py-1">{r.keterangan || "-"}</td>
                    <td className="px-2 py-1">{kategoriLabel[r.kategori] || r.kategori}</td>
                    <td className="px-2 py-1 text-right font-semibold">{formatRupiah(r.jumlah)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
