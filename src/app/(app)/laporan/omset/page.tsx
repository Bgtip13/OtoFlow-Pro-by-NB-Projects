"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate } from "@/lib/format";
import { useRequestGuard } from "@/lib/hooks";
import PageHeader from "@/components/page-header";
import { FilterBar, PeriodFilter, startOfMonthISO, todayISO } from "@/components/filter-bar";
import { Badge, DataTable, Pagination, StatCard, type TableColumn } from "@/components/ui";
import { Banknote, TrendingUp } from "lucide-react";

const PAGE_SIZE = 50;

const kategoriLabel: Record<string, string> = {
  penjualan: "Penjualan",
  servis: "Servis",
  piutang: "Pelunasan Piutang",
};

const kategoriTone: Record<string, "blue" | "green" | "amber" | "slate"> = {
  penjualan: "blue",
  servis: "green",
  piutang: "amber",
};

type Row = { tanggal: string; keterangan: string; kategori: string; jumlah: number };

export default function OmsetPage() {
  const supabase = createClient();
  const guard = useRequestGuard();

  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [page, setPage] = useState(0);

  async function load() {
    const requestId = guard.next();
    setLoading(true);

    const { data, error } = await supabase
      .from("ledgers")
      .select("tanggal, keterangan, kategori, jumlah")
      .eq("tipe", "masuk")
      .gte("tanggal", from)
      .lte("tanggal", to)
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false });

    if (!guard.isCurrent(requestId)) return;

    const list = (data ?? []) as Row[];
    setRows(list);
    if (error) console.error(error);

    const s: Record<string, number> = {};
    for (const r of list) s[r.kategori] = (s[r.kategori] || 0) + r.jumlah;
    setSummary(s);
    setPage(0);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const columns: TableColumn<Row>[] = [
    { key: "tanggal", header: "Tanggal", render: (r) => <span className="text-slate-500">{formatDate(r.tanggal)}</span> },
    { key: "keterangan", header: "Keterangan", render: (r) => <span className="font-medium text-slate-700">{r.keterangan || "-"}</span> },
    {
      key: "kategori",
      header: "Kategori",
      render: (r) => <Badge tone={kategoriTone[r.kategori] ?? "slate"}>{kategoriLabel[r.kategori] || r.kategori}</Badge>,
    },
    {
      key: "jumlah",
      header: "Jumlah",
      align: "right",
      render: (r) => <span className="font-semibold text-slate-800">{formatRupiah(r.jumlah)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        icon={TrendingUp}
        title="Omset Penjualan"
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

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Omset" value={formatRupiah(total)} icon={Banknote} tone="blue" />
        {Object.entries(kategoriLabel).map(([k, label]) => (
          <StatCard
            key={k}
            label={label}
            value={formatRupiah(summary[k] || 0)}
            icon={TrendingUp}
            tone={kategoriTone[k] ?? "slate"}
          />
        ))}
      </div>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(r, i) => `${r.tanggal}-${page}-${i}`}
          loading={loading}
          empty="Tidak ada transaksi pada periode ini."
          emptyIcon={Banknote}
          footer={
            rows.length > PAGE_SIZE ? (
              <Pagination page={page} totalPages={totalPages} total={rows.length} onChange={setPage} />
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
