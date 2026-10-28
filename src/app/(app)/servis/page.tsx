"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate } from "@/lib/format";
import { useDebouncedValue, useRequestGuard } from "@/lib/hooks";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { FilterBar, SearchInput, SelectFilter } from "@/components/filter-bar";
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
import { deleteServiceInvoice, completeServiceInvoice } from "@/lib/invoice-utils";
import { CheckCircle2, Filter, Pencil, Plus, Printer, Trash2, Wrench } from "lucide-react";

const PAGE_SIZE = 20;

type ServiceInvoice = {
  id: string;
  no_nota: string;
  tanggal: string;
  customer_name: string;
  mechanic_name: string;
  total: number;
  status: "pengerjaan" | "selesai";
};

type StatusFilter = "all" | "pengerjaan" | "selesai";

export default function ServisPage() {
  const supabase = createClient();
  const toast = useToast();
  const guard = useRequestGuard();

  const [rows, setRows] = useState<ServiceInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ aktif: 0, selesai: 0 });

  async function load() {
    const requestId = guard.next();
    setLoading(true);

    let query = supabase
      .from("service_invoices")
      .select("id, no_nota, tanggal, customer_name, mechanic_name, total, status", { count: "exact" })
      .order("tanggal", { ascending: false })
      .order("no_nota", { ascending: false });

    const s = debouncedSearch.trim();
    if (s) {
      const like = `%${s.replace(/[",()]/g, " ")}%`;
      query = query.or(`no_nota.ilike."${like}",customer_name.ilike."${like}",mechanic_name.ilike."${like}"`);
    }
    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const [listRes, aktifRes, selesaiRes] = await Promise.all([
      query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
      supabase.from("service_invoices").select("id", { count: "exact", head: true }).eq("status", "pengerjaan"),
      supabase.from("service_invoices").select("id", { count: "exact", head: true }).eq("status", "selesai"),
    ]);

    if (!guard.isCurrent(requestId)) return;

    if (listRes.data) {
      setRows(listRes.data as ServiceInvoice[]);
      setTotal(listRes.count ?? 0);
    }
    if (listRes.error) toast.error(`Gagal memuat: ${listRes.error.message}`);
    setCounts({ aktif: aktifRes.count ?? 0, selesai: selesaiRes.count ?? 0 });
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, statusFilter]);

  async function handleComplete(r: ServiceInvoice) {
    if (!confirm(`Tandai ${r.no_nota} sebagai SELESAI? Pemasukan akan masuk laporan laba rugi.`)) return;
    try {
      await completeServiceInvoice(supabase, r.id, r.total, r.no_nota);
      toast.success(`${r.no_nota} selesai.`);
      load();
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`);
    }
  }

  async function handleDelete(r: ServiceInvoice) {
    if (!confirm(`Hapus nota servis ${r.no_nota}? Stok sparepart akan dikembalikan.`)) return;
    try {
      await deleteServiceInvoice(supabase, r.id);
      toast.success(`Nota ${r.no_nota} dihapus.`);
      load();
    } catch (e: any) {
      toast.error(`Gagal menghapus: ${e.message}`);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns: TableColumn<ServiceInvoice>[] = [
    { key: "no_nota", header: "No Nota", render: (r) => <span className="font-mono text-xs font-semibold text-slate-700">{r.no_nota}</span> },
    { key: "tanggal", header: "Tanggal", render: (r) => <span className="text-slate-500">{formatDate(r.tanggal)}</span> },
    { key: "customer_name", header: "Pelanggan", render: (r) => <span className="font-medium text-slate-700">{r.customer_name || "Umum"}</span> },
    { key: "mechanic_name", header: "Mekanik", render: (r) => <span className="text-slate-500">{r.mechanic_name || "-"}</span> },
    { key: "total", header: "Total", align: "right", render: (r) => <span className="font-semibold text-slate-800">{formatRupiah(r.total)}</span> },
    {
      key: "status",
      header: "Status",
      render: (r) =>
        r.status === "selesai" ? <Badge tone="green">Selesai</Badge> : <Badge tone="blue">Pengerjaan</Badge>,
    },
    {
      key: "__aksi",
      header: "Aksi",
      align: "right",
      className: "whitespace-nowrap",
      headerClassName: "text-right",
      render: (r) => (
        <RowActions>
          <RowAction icon={Printer} tone="blue" href={`/servis/${r.id}`}>
            Cetak
          </RowAction>
          <RowAction icon={Pencil} href={`/servis/baru?id=${r.id}`}>
            Edit
          </RowAction>
          {r.status === "pengerjaan" && (
            <RowAction icon={CheckCircle2} tone="green" onClick={() => handleComplete(r)}>
              Selesai
            </RowAction>
          )}
          <RowAction icon={Trash2} tone="red" onClick={() => handleDelete(r)}>
            Hapus
          </RowAction>
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader icon={Wrench} title="Servis" subtitle={`${total} nota servis`}>
        <Link href="/servis/baru">
          <Button icon={Plus} variant="primary">
            Nota Servis Baru
          </Button>
        </Link>
      </PageHeader>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Jumlah Nota" value={total} icon={Wrench} tone="slate" />
        <StatCard label="Masih Pengerjaan" value={counts.aktif} icon={Wrench} tone="blue" hint="Seluruh data" />
        <StatCard label="Sudah Selesai" value={counts.selesai} icon={CheckCircle2} tone="green" hint="Seluruh data" />
      </div>

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Cari no nota / pelanggan / mekanik..."
        />
        <SelectFilter<StatusFilter>
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(0);
          }}
          icon={Filter}
          ariaLabel="Filter status servis"
          options={[
            { value: "all", label: "Semua Status" },
            { value: "pengerjaan", label: "Pengerjaan" },
            { value: "selesai", label: "Selesai" },
          ]}
        />
      </FilterBar>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          empty="Belum ada nota servis."
          emptyIcon={Wrench}
          footer={<Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />}
        />
      </div>
    </div>
  );
}
