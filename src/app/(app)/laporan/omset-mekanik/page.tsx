"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate, todayISO } from "@/lib/format";
import DateInput from "@/components/date-input";
import PageHeader from "@/components/page-header";
import { Gauge, HandCoins, TrendingUp, Users } from "lucide-react";

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

type Row = {
  mechanic_name: string;
  count: number;
  omset: number;
  komisi: number;
};

export default function OmsetMekanikPage() {
  const supabase = createClient();
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

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
      .from("service_invoices")
      .select("mechanic_name, total, komisi_total")
      .gte("tanggal", from)
      .lte("tanggal", to);
    const map = new Map<string, Row>();
    for (const r of data ?? []) {
      const name = r.mechanic_name || "-";
      const cur = map.get(name) ?? { mechanic_name: name, count: 0, omset: 0, komisi: 0 };
      cur.count += 1;
      cur.omset += r.total;
      cur.komisi += r.komisi_total;
      map.set(name, cur);
    }
    setRows([...map.values()].sort((a, b) => b.omset - a.omset));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const totalOmset = rows.reduce((s, r) => s + r.omset, 0);
  const totalKomisi = rows.reduce((s, r) => s + r.komisi, 0);

  return (
    <div>
      <PageHeader icon={Gauge} title="Omset per Mekanik" subtitle={`Periode ${formatDate(from)} s/d ${formatDate(to)}`}>
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
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                <TrendingUp className="h-4 w-4 text-blue-600" /> Total Omset
              </div>
              <div className="mt-1 text-xl font-bold text-blue-700">{formatRupiah(totalOmset)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                <HandCoins className="h-4 w-4 text-amber-500" /> Total Komisi
              </div>
              <div className="mt-1 text-xl font-bold text-amber-600">{formatRupiah(totalKomisi)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                <Users className="h-4 w-4 text-slate-500" /> Jumlah Mekanik
              </div>
              <div className="mt-1 text-xl font-bold text-slate-700">{rows.length}</div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">Mekanik</th>
                  <th className="px-2 py-1.5 text-right">Jumlah Servis</th>
                  <th className="px-2 py-1.5 text-right">Omset</th>
                  <th className="px-2 py-1.5 text-right">Komisi</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={4} className="px-2 py-4 text-center text-slate-400">Belum ada data.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.mechanic_name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-2 py-1 font-medium">{r.mechanic_name}</td>
                    <td className="px-2 py-1 text-right">{r.count}</td>
                    <td className="px-2 py-1 text-right font-semibold">{formatRupiah(r.omset)}</td>
                    <td className="px-2 py-1 text-right">{formatRupiah(r.komisi)}</td>
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
