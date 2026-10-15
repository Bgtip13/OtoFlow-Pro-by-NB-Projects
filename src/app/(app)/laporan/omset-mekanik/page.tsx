"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate } from "@/lib/format";
import PageHeader from "@/components/page-header";
import { FilterBar, PeriodFilter, startOfMonthISO, todayISO } from "@/components/filter-bar";
import { DataTable, StatCard, type TableColumn } from "@/components/ui";
import { Gauge, HandCoins, TrendingUp, Users } from "lucide-react";

type Row = {
  mechanic_name: string;
  count: number;
  omset: number;
  komisi: number;
};

export default function OmsetMekanikPage() {
  const supabase = createClient();
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

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

  const columns: TableColumn<Row>[] = [
    { key: "mechanic_name", header: "Mekanik", render: (r) => <span className="font-medium text-slate-700">{r.mechanic_name}</span> },
    { key: "count", header: "Jumlah Servis", align: "right", render: (r) => r.count },
    { key: "omset", header: "Omset", align: "right", render: (r) => <span className="font-semibold text-slate-800">{formatRupiah(r.omset)}</span> },
    { key: "komisi", header: "Komisi", align: "right", render: (r) => <span className="text-amber-600">{formatRupiah(r.komisi)}</span> },
  ];

  return (
    <div>
      <PageHeader icon={Gauge} title="Omset per Mekanik" subtitle={`Periode ${formatDate(from)} s/d ${formatDate(to)}`} />

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

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Omset" value={formatRupiah(totalOmset)} icon={TrendingUp} tone="blue" />
        <StatCard label="Total Komisi" value={formatRupiah(totalKomisi)} icon={HandCoins} tone="amber" />
        <StatCard label="Jumlah Mekanik" value={rows.length} icon={Users} tone="slate" />
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.mechanic_name}
          loading={loading}
          empty="Belum ada data pada periode ini."
          emptyIcon={Gauge}
        />
      </div>
    </div>
  );
}
