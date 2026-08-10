"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate } from "@/lib/format";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { deleteServiceInvoice, completeServiceInvoice } from "@/lib/invoice-utils";
import { CheckCircle2, Pencil, Plus, Printer, Trash2, Wrench } from "lucide-react";

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

export default function ServisPage() {
  const supabase = createClient();
  const toast = useToast();
  const [rows, setRows] = useState<ServiceInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let query = supabase
      .from("service_invoices")
      .select("*", { count: "exact" })
      .order("tanggal", { ascending: false })
      .order("no_nota", { ascending: false });
    const s = search.trim();
    if (s) {
      const like = `%${s}%`;
      query = query.or(`no_nota.ilike.${like},customer_name.ilike.${like}`);
    }
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
  }, [page, search]);

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

  return (
    <div>
      <PageHeader icon={Wrench} title="Servis" subtitle={`${total} nota`}>
        <Link
          href="/servis/baru"
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nota Servis Baru
        </Link>
      </PageHeader>

      <div className="mt-4">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Cari no nota / nama pelanggan..."
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-2 py-1.5">No Nota</th>
              <th className="px-2 py-1.5">Tanggal</th>
              <th className="px-2 py-1.5">Pelanggan</th>
              <th className="px-2 py-1.5">Mekanik</th>
              <th className="px-2 py-1.5 text-right">Total</th>
              <th className="px-2 py-1.5">Status</th>
              <th className="px-2 py-1.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-2 py-4 text-center text-slate-400">Memuat...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-2 py-4 text-center text-slate-400">Belum ada nota servis.</td></tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-2 py-1 font-mono">{r.no_nota}</td>
                  <td className="px-2 py-1">{formatDate(r.tanggal)}</td>
                  <td className="px-2 py-1">{r.customer_name}</td>
                  <td className="px-2 py-1">{r.mechanic_name || "-"}</td>
                  <td className="px-2 py-1 text-right font-semibold">{formatRupiah(r.total)}</td>
                  <td className="px-2 py-1">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      r.status === "selesai" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {r.status === "selesai" ? "SELESAI" : "PENGERJAAN"}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-right whitespace-nowrap">
                    <Link href={`/servis/${r.id}`} className="text-blue-600 hover:underline"><Printer className="mr-0.5 inline h-3.5 w-3.5 align-text-bottom" />Cetak</Link>
                    <Link href={`/servis/baru?id=${r.id}`} className="ml-2 text-slate-600 hover:underline"><Pencil className="mr-0.5 inline h-3.5 w-3.5 align-text-bottom" />Edit</Link>
                    {r.status === "pengerjaan" && (
                      <button onClick={() => handleComplete(r)} className="ml-2 text-green-600 hover:underline"><CheckCircle2 className="mr-0.5 inline h-3.5 w-3.5 align-text-bottom" />Selesai</button>
                    )}
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
