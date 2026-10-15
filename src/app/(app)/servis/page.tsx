"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate } from "@/lib/format";
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
  const [rows, setRows] = useState<ServiceInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let query = supabase
      .from("service_invoices")
      .select("*", { count: "exact" })
      .order("tanggal", { ascending: false })
      .order("no_nota", { ascending: false });
    const s = search.trim();
    if (s) query = query.or(`no_nota.ilike.%${s}%,customer_name.ilike.%${s}%`);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    const { data, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (data) {
      setRows(data as ServiceInvoice[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter]);

  async function handleComplete(r: ServiceInvoice) {
    if (!confirm(`Tandai ${r.no_nota} sebagai SELESAI? Pemasukan akan masuk laporan laba rugi.`)) return;
    try {
      await completeServiceInvoice(supabase, r.id, r.total, r.no_nota);
      toast.success(`${r.no_nota} selesai.`);
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`);
    }
    load();
  }

  async function handleDelete(r: ServiceInvoice) {
    if (!confirm(`Hapus nota servis ${r.no_nota}? Stok sparepart akan dikembalikan.`)) return;
    await deleteServiceInvoice(supabase, r.id);
    toast.success(`Nota ${r.no_nota} dihapus.`);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const aktif = rows.filter((r) => r.status === "pengerjaan").length;
  const selesai = rows.filter((r) => r.status === "selesai").length;

  const columns: TableColumn<ServiceInvoice>[] = [
    { key: "no_nota", header: "No Nota", render: (r) => <span className="font-mono font-semibold text-slate-700">{r.no_nota}</span> },
    { key: "tanggal", header: "Tanggal", render: (r) => formatDate(r.tanggal) },
    { key: "customer_name", header: "Pelanggan", render: (r) => r.customer_name || "Umum" },
    { key: "mechanic_name", header: "Mekanik", render: (r) => r.mechanic_name || "-" },
    { key: "total", header: "Total", align: "right", render: (r) => <span className="font-semibold text-slate-800">{formatRupiah(r.total)}</span> },
    {
      key: "status",
      header: "Status",
      render: (r) => (r.status === "selesai" ? <Badge tone="green">Selesai</Badge> : <Badge tone="blue">Pengerjaan</Badge>),
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
        <StatCard label="Masih Pengerjaan" value={aktif} icon={Wrench} tone="blue" hint="Di halaman ini" />
        <StatCard label="Sudah Selesai" value={selesai} icon={CheckCircle2} tone="green" hint="Di halaman ini" />
      </div>

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Cari no nota / pelanggan..."
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
