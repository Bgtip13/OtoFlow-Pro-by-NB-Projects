"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate } from "@/lib/format";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { deleteInboundInvoice } from "@/lib/invoice-utils";
import { PackagePlus, Pencil, Plus, Printer, Trash2 } from "lucide-react";

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

  async function load() {
    setLoading(true);
    let query = supabase
      .from("inbound_invoices")
      .select("*", { count: "exact" })
      .order("tanggal", { ascending: false })
      .order("no_nota", { ascending: false });
    const s = search.trim();
    if (s) {
      const like = `%${s}%`;
      query = query.or(`no_nota.ilike.${like},supplier_name.ilike.${like}`);
    }
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

  return (
    <div>
      <PageHeader icon={PackagePlus} title="Pembelian" subtitle={`${total} nota`}>
        <Link href="/pembelian/baru" className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Pembelian Baru
        </Link>
      </PageHeader>

      <div className="mt-4">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Cari no nota / nama supplier..."
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-2 py-1.5">No Nota</th>
              <th className="px-2 py-1.5">Tanggal</th>
              <th className="px-2 py-1.5">Supplier</th>
              <th className="px-2 py-1.5 text-right">Total</th>
              <th className="px-2 py-1.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-400">Memuat...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-400">Belum ada pembelian.</td></tr>}
            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-2 py-1 font-mono">{r.no_nota}</td>
                  <td className="px-2 py-1">{formatDate(r.tanggal)}</td>
                  <td className="px-2 py-1">{r.supplier_name}</td>
                  <td className="px-2 py-1 text-right font-semibold">{formatRupiah(r.total)}</td>
                  <td className="px-2 py-1 text-right whitespace-nowrap">
                    <Link href={`/pembelian/${r.id}`} className="text-blue-600 hover:underline"><Printer className="mr-0.5 inline h-3.5 w-3.5 align-text-bottom" />Cetak</Link>
                    <Link href={`/pembelian/baru?id=${r.id}`} className="ml-2 text-slate-600 hover:underline"><Pencil className="mr-0.5 inline h-3.5 w-3.5 align-text-bottom" />Edit</Link>
                    <button onClick={() => handleDelete(r)} className="ml-2 text-red-600 hover:underline"><Trash2 className="mr-0.5 inline h-3.5 w-3.5 align-text-bottom" />Hapus</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>Halaman {page + 1} dari {totalPages} · {total} data</span>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">← Sebelumnya</button>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">Berikutnya →</button>
        </div>
      </div>
    </div>
  );
}
