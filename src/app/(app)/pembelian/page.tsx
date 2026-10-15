"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate } from "@/lib/format";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { FilterBar, SearchInput } from "@/components/filter-bar";
import {
  Button,
  DataTable,
  Pagination,
  RowAction,
  RowActions,
  StatCard,
  type TableColumn,
} from "@/components/ui";
import { deleteInboundInvoice } from "@/lib/invoice-utils";
import { PackagePlus, Pencil, Plus, Printer, Trash2, Truck } from "lucide-react";

const PAGE_SIZE = 20;

type Invoice = {
  id: string;
  no_nota: string;
  tanggal: string;
  supplier_name: string;
  total: number;
};

export default function PembelianPage() {
  const supabase = createClient();
  const toast = useToast();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  function searchOr() {
    const s = search.trim();
    return s ? `no_nota.ilike.%${s}%,supplier_name.ilike.%${s}%` : "";
  }

  async function load() {
    setLoading(true);
    let query = supabase
      .from("inbound_invoices")
      .select("*", { count: "exact" })
      .order("tanggal", { ascending: false })
      .order("no_nota", { ascending: false });
    const or = searchOr();
    if (or) query = query.or(or);
    const { data, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (data) {
      setRows(data as Invoice[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  async function handleDelete(r: Invoice) {
    if (!confirm(`Hapus pembelian ${r.no_nota}? Stok barang akan dikurangi kembali.`)) return;
    await deleteInboundInvoice(supabase, r.id);
    toast.success(`Pembelian ${r.no_nota} dihapus.`);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const totalNilai = rows.reduce((s, r) => s + (r.total || 0), 0);

  const columns: TableColumn<Invoice>[] = [
    { key: "no_nota", header: "No Nota", render: (r) => <span className="font-mono font-semibold text-slate-700">{r.no_nota}</span> },
    { key: "tanggal", header: "Tanggal", render: (r) => formatDate(r.tanggal) },
    { key: "supplier_name", header: "Supplier", render: (r) => r.supplier_name || "-" },
    { key: "total", header: "Total", align: "right", render: (r) => <span className="font-semibold text-slate-800">{formatRupiah(r.total)}</span> },
    {
      key: "__aksi",
      header: "Aksi",
      align: "right",
      className: "whitespace-nowrap",
      headerClassName: "text-right",
      render: (r) => (
        <RowActions>
          <RowAction icon={Printer} tone="blue" href={`/pembelian/${r.id}`}>
            Cetak
          </RowAction>
          <RowAction icon={Pencil} href={`/pembelian/baru?id=${r.id}`}>
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
      <PageHeader icon={PackagePlus} title="Pembelian" subtitle={`${total} nota pembelian`}>
        <Link href="/pembelian/baru">
          <Button icon={Plus} variant="primary">
            Pembelian Baru
          </Button>
        </Link>
      </PageHeader>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Jumlah Nota" value={total} icon={PackagePlus} tone="slate" />
        <StatCard label="Nilai di Halaman Ini" value={formatRupiah(totalNilai)} icon={Truck} tone="blue" />
      </div>

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Cari no nota / supplier..."
        />
      </FilterBar>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          empty="Belum ada pembelian."
          emptyIcon={PackagePlus}
          footer={<Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />}
        />
      </div>
    </div>
  );
}
