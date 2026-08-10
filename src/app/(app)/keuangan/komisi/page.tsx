"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate, todayISO } from "@/lib/format";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { Check, HandCoins } from "lucide-react";

const PAGE_SIZE = 20;

type Comm = {
  id: string;
  service_invoice_id: string;
  mechanic_id: string | null;
  jumlah: number;
  status: "belum_dibayar" | "lunas";
  paid_at: string | null;
  note: string;
  service_invoices: { no_nota: string; customer_name: string } | null;
  mechanics: { nama: string } | null;
};

export default function KomisiPage() {
  const supabase = createClient();
  const toast = useToast();
  const [rows, setRows] = useState<Comm[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<"all" | "belum_dibayar" | "lunas">("belum_dibayar");
  const [loading, setLoading] = useState(true);

  const [payTarget, setPayTarget] = useState<Comm | null>(null);
  const [payJumlah, setPayJumlah] = useState("");
  const [payNote, setPayNote] = useState("");
  const [paying, setPaying] = useState(false);

  async function load() {
    setLoading(true);
    let query = supabase
      .from("mechanic_commissions")
      .select("*, service_invoices(no_nota, customer_name), mechanics(nama)", { count: "exact" })
      .order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    const { data, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (data) {
      setRows(data as Comm[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter]);

  function openPay(c: Comm) {
    setPayTarget(c);
    setPayJumlah(String(c.jumlah));
    setPayNote("");
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!payTarget) return;
    const jumlah = Number(payJumlah) || 0;
    if (jumlah <= 0) {
      toast.error("Jumlah pembayaran harus lebih dari 0.");
      return;
    }
    setPaying(true);

    const { error } = await supabase
      .from("mechanic_commissions")
      .update({ status: "lunas", paid_at: new Date().toISOString(), note: payNote })
      .eq("id", payTarget.id);
    if (error) {
      toast.error(error.message);
      setPaying(false);
      return;
    }

    await supabase.from("ledgers").insert({
      tanggal: todayISO(),
      tipe: "keluar",
      kategori: "komisi",
      jumlah,
      ref_type: "mechanic_commissions",
      ref_id: payTarget.id,
      keterangan: `Komisi ${payTarget.mechanics?.nama ?? ""} - ${payTarget.service_invoices?.no_nota ?? ""}`,
    });

    toast.success("Komisi dibayarkan & tercatat di pengeluaran.");
    setPaying(false);
    setPayTarget(null);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader icon={HandCoins} title="Pembayaran Komisi Mekanik" subtitle={`${total} komisi`}>
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value as any); setPage(0); }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="belum_dibayar">Belum Dibayar</option>
          <option value="lunas">Sudah Dibayar</option>
          <option value="all">Semua</option>
        </select>
      </PageHeader>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-2 py-1.5">No Nota Servis</th>
              <th className="px-2 py-1.5">Pelanggan</th>
              <th className="px-2 py-1.5">Mekanik</th>
              <th className="px-2 py-1.5 text-right">Komisi</th>
              <th className="px-2 py-1.5">Status</th>
              <th className="px-2 py-1.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-2 py-4 text-center text-slate-400">Memuat...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-2 py-4 text-center text-slate-400">Tidak ada komisi.</td></tr>}
            {!loading &&
              rows.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-2 py-1 font-mono">{c.service_invoices?.no_nota ?? "-"}</td>
                  <td className="px-2 py-1">{c.service_invoices?.customer_name ?? "-"}</td>
                  <td className="px-2 py-1">{c.mechanics?.nama ?? "-"}</td>
                  <td className="px-2 py-1 text-right font-semibold">{formatRupiah(c.jumlah)}</td>
                  <td className="px-2 py-1">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      c.status === "lunas" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {c.status === "lunas" ? "LUNAS" : "BELUM"}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-right">
                    {c.status === "belum_dibayar" && (
                      <button onClick={() => openPay(c)} className="text-blue-600 hover:underline"><Check className="mr-0.5 inline h-3.5 w-3.5 align-text-bottom" />Bayar</button>
                    )}
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

      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handlePay} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-800">Bayar Komisi</h2>
            <p className="mt-1 text-sm text-slate-500">
              {payTarget.mechanics?.nama ?? "-"} · {payTarget.service_invoices?.no_nota ?? ""}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Jumlah (Rp)</label>
                <input type="number" value={payJumlah} onChange={(e) => setPayJumlah(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Catatan</label>
                <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Opsional"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPayTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Batal</button>
              <button type="submit" disabled={paying} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {paying ? "Memproses..." : "Bayar & Catat"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
