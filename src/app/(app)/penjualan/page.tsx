"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate } from "@/lib/format";
import { useDebouncedValue, useRequestGuard } from "@/lib/hooks";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { FilterBar, FilterSpacer, PeriodFilter, SearchInput, todayISO } from "@/components/filter-bar";
import {
  Badge,
  Button,
  DataTable,
  Pagination,
  RowAction,
  RowActions,
  StatCard,
  type TableColumn,
} from "@/components/ui";
import { deleteSalesInvoice } from "@/lib/invoice-utils";
import { Banknote, CreditCard, FileText, Pencil, Plus, Printer, Receipt, Trash2 } from "lucide-react";

const PAGE_SIZE = 20;

type SalesInvoice = {
  id: string;
  no_nota: string;
  tanggal: string;
  customer_name: string;
  status: "lunas" | "top";
  jatuh_tempo: string | null;
  total: number;
};

function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function PenjualanPage() {
  const supabase = createClient();
  const toast = useToast();
  const guard = useRequestGuard();

  const [rows, setRows] = useState<SalesInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(todayISO());
  const [summary, setSummary] = useState({ omset: 0, count: 0, lunas: 0, top: 0 });
  const [loading, setLoading] = useState(true);

  function searchFilter() {
    const s = debouncedSearch.trim();
    if (!s) return "";
    const like = `%${s.replace(/[",()]/g, " ")}%`;
    return `no_nota.ilike."${like}",customer_name.ilike."${like}"`;
  }

  async function load() {
    const requestId = guard.next();
    setLoading(true);

    const filter = searchFilter();

    let query = supabase
      .from("sales_invoices")
      .select("id, no_nota, tanggal, customer_name, status, jatuh_tempo, total", { count: "exact" })
      .gte("tanggal", from)
      .lte("tanggal", to)
      .order("tanggal", { ascending: false })
      .order("no_nota", { ascending: false });
    if (filter) query = query.or(filter);

    // Ringkasan dijalankan paralel dengan daftar (dulu berurutan → terasa lambat)
    let sumQuery = supabase
      .from("sales_invoices")
      .select("total, status")
      .gte("tanggal", from)
      .lte("tanggal", to);
    if (filter) sumQuery = sumQuery.or(filter);

    const [listRes, sumRes] = await Promise.all([
      query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
      sumQuery,
    ]);

    if (!guard.isCurrent(requestId)) return;

    if (listRes.error) toast.error(`Gagal memuat: ${listRes.error.message}`);
    if (listRes.data) {
      setRows(listRes.data as SalesInvoice[]);
      setTotal(listRes.count ?? 0);
    }

    const agg = { omset: 0, count: 0, lunas: 0, top: 0 };
    for (const r of sumRes.data ?? []) {
      agg.omset += r.total ?? 0;
      agg.count += 1;
      if (r.status === "top") agg.top += 1;
      else agg.lunas += 1;
    }
    setSummary(agg);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, from, to]);

  async function handleDelete(r: SalesInvoice) {
    if (!confirm(`Hapus nota penjualan ${r.no_nota}? Stok barang dikembalikan dan jurnal/piutang dibersihkan.`)) return;
    try {
      await deleteSalesInvoice(supabase, r.id);
      toast.success(`Nota ${r.no_nota} dihapus.`);
      load();
    } catch (e: any) {
      toast.error(`Gagal menghapus: ${e.message}`);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const today = todayISO();

  const columns: TableColumn<SalesInvoice>[] = [
    {
      key: "no_nota",
      header: "No Nota",
      render: (r) => <span className="font-mono text-xs font-semibold text-slate-700">{r.no_nota}</span>,
    },
    { key: "tanggal", header: "Tanggal", render: (r) => <span className="text-slate-500">{formatDate(r.tanggal)}</span> },
    { key: "customer_name", header: "Pelanggan", render: (r) => <span className="font-medium text-slate-700">{r.customer_name || "Umum"}</span> },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const overdue = r.status === "top" && !!r.jatuh_tempo && r.jatuh_tempo < today;
        return (
          <div className="flex flex-wrap items-center gap-1">
            {r.status === "lunas" ? <Badge tone="green">Lunas</Badge> : <Badge tone="amber">TOP</Badge>}
            {overdue && <Badge tone="red">Lewat</Badge>}
            {r.status === "top" && r.jatuh_tempo && !overdue && (
              <span className="text-[10px] text-slate-400">jt {formatDate(r.jatuh_tempo)}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (r) => <span className="font-semibold text-slate-800">{formatRupiah(r.total)}</span>,
    },
    {
      key: "__aksi",
      header: "Aksi",
      align: "right",
      className: "whitespace-nowrap",
      headerClassName: "text-right",
      render: (r) => (
        <RowActions>
          <RowAction icon={Printer} tone="blue" href={`/penjualan/${r.id}`}>
            Cetak
          </RowAction>
          <RowAction icon={Pencil} href={`/penjualan/baru?id=${r.id}`}>
            Edit
          </RowAction>
          <RowAction icon={Trash2} tone="red" onClick={() => handleDelete(r)}>
            Hapus
          </RowAction>
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        icon={Receipt}
        title="Penjualan"
        subtitle={`${summary.count} nota · ${formatDate(from)} s/d ${formatDate(to)}`}
      >
        <Link href="/penjualan/baru">
          <Button icon={Plus} variant="primary">
            Nota Penjualan Baru
          </Button>
        </Link>
      </PageHeader>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Omset" value={formatRupiah(summary.omset)} icon={Banknote} tone="blue" />
        <StatCard label="Jumlah Nota" value={summary.count} icon={FileText} tone="slate" />
        <StatCard label="Nota Lunas" value={summary.lunas} icon={Receipt} tone="green" />
        <StatCard label="Nota TOP" value={summary.top} icon={CreditCard} tone="amber" />
      </div>

      <FilterBar>
        <PeriodFilter
          from={from}
          to={to}
          onChange={(f, t) => {
            setFrom(f);
            setTo(t);
            setPage(0);
          }}
        />
        <FilterSpacer />
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Cari no nota / pelanggan..."
          className="sm:w-64"
        />
      </FilterBar>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          empty="Belum ada penjualan pada periode ini."
          emptyIcon={Receipt}
          footer={<Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />}
        />
      </div>
    </div>
  );
}
