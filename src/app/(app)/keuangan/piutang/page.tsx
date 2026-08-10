"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate, todayISO } from "@/lib/format";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { Check, CreditCard } from "lucide-react";

const PAGE_SIZE = 20;

type Rec = {
  id: string;
  sales_invoice_id: string;
  total: number;
  paid: number;
  status: "belum_lunas" | "lunas";
  jatuh_tempo: string;
  sales_invoices: { no_nota: string; customer_name: string } | null;
};

export default function PiutangPage() {
  const supabase = createClient();
  const toast = useToast();
  const [rows, setRows] = useState<Rec[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<"all" | "belum_lunas" | "lunas">("belum_lunas");
  const [loading, setLoading] = useState(true);

  const [payTarget, setPayTarget] = useState<Rec | null>(null);
  const [payJumlah, setPayJumlah] = useState("");
  const [payNote, setPayNote] = useState("");
  const [paying, setPaying] = useState(false);

  async function load() {
    setLoading(true);
    let query = supabase
      .from("receivables")
      .select("*, sales_invoices(no_nota, customer_name)", { count: "exact" })
      .order("jatuh_tempo", { ascending: true });
    if (filter !== "all") query = query.eq("status", filter);
    const { data, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (data) {
      setRows(data as Rec[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter]);

  function openPay(r: Rec) {
    setPayTarget(r);
    setPayJumlah(String(r.total - r.paid));
    setPayNote("");
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!payTarget) return;
    const sisa = payTarget.total - payTarget.paid;
    const jumlah = Number(payJumlah) || 0;
    if (jumlah <= 0) {
      toast.error("Jumlah pembayaran harus lebih dari 0.");
      return;
    }
    if (jumlah > sisa) {
      toast.error(`Jumlah melebihi sisa piutang (${formatRupiah(sisa)}).`);
      return;
    }
    setPaying(true);

    const { data: pay, error: errPay } = await supabase
      .from("receivable_payments")
      .insert({ receivable_id: payTarget.id, tanggal: todayISO(), jumlah, note: payNote })
      .select()
      .single();
    if (errPay) {
      toast.error(errPay.message);
      setPaying(false);
      return;
    }

    const newPaid = payTarget.paid + jumlah;
    const newStatus = newPaid >= payTarget.total ? "lunas" : "belum_lunas";
    const { error: errUpd } = await supabase
      .from("receivables")
      .update({ paid: newPaid, status: newStatus })
      .eq("id", payTarget.id);
    if (errUpd) {
      toast.error(errUpd.message);
      setPaying(false);
      return;
    }

    await supabase.from("ledgers").insert({
      tanggal: todayISO(),
      tipe: "masuk",
      kategori: "piutang",
      jumlah,
      ref_type: "receivable_payments",
      ref_id: pay.id,
      keterangan: `Pelunasan ${payTarget.sales_invoices?.no_nota ?? ""}`,
    });

    toast.success(newStatus === "lunas" ? "Piutang lunas!" : "Pembayaran cicilan tercatat.");
    setPaying(false);
    setPayTarget(null);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const today = todayISO();

  return (
    <div>
      <PageHeader icon={CreditCard} title="Piutang (TOP)" subtitle={`${total} piutang`}>
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value as any); setPage(0); }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="belum_lunas">Belum Lunas</option>
          <option value="lunas">Lunas</option>
          <option value="all">Semua</option>
        </select>
      </PageHeader>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-2 py-1.5">No Nota</th>
              <th className="px-2 py-1.5">Pelanggan</th>
              <th className="px-2 py-1.5 text-right">Total</th>
              <th className="px-2 py-1.5 text-right">Dibayar</th>
              <th className="px-2 py-1.5 text-right">Sisa</th>
              <th className="px-2 py-1.5">Jatuh Tempo</th>
              <th className="px-2 py-1.5">Status</th>
              <th className="px-2 py-1.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-2 py-4 text-center text-slate-400">Memuat...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={8} className="px-2 py-4 text-center text-slate-400">Tidak ada piutang.</td></tr>}
            {!loading &&
              rows.map((r) => {
                const sisa = r.total - r.paid;
                const overdue = r.status === "belum_lunas" && r.jatuh_tempo < today;
                return (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-2 py-1 font-mono">{r.sales_invoices?.no_nota ?? "-"}</td>
                    <td className="px-2 py-1">{r.sales_invoices?.customer_name ?? "-"}</td>
                    <td className="px-2 py-1 text-right">{formatRupiah(r.total)}</td>
                    <td className="px-2 py-1 text-right">{formatRupiah(r.paid)}</td>
                    <td className="px-2 py-1 text-right font-semibold">{formatRupiah(sisa)}</td>
                    <td className="px-2 py-1">
                      {formatDate(r.jatuh_tempo)}
                      {overdue && <span className="ml-1 rounded bg-red-100 px-1 py-0.5 text-[9px] font-bold text-red-600">LEWAT</span>}
                    </td>
                    <td className="px-2 py-1">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        r.status === "lunas" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {r.status === "lunas" ? "LUNAS" : "BELUM"}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-right">
                      {r.status === "belum_lunas" && (
                        <button onClick={() => openPay(r)} className="text-blue-600 hover:underline"><Check className="mr-0.5 inline h-3.5 w-3.5 align-text-bottom" />Bayar</button>
                      )}
                    </td>
                  </tr>
                );
              })}
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
            <h2 className="text-lg font-bold text-slate-800">Bayar Piutang</h2>
            <p className="mt-1 text-sm text-slate-500">
              {payTarget.sales_invoices?.no_nota ?? ""} · {payTarget.sales_invoices?.customer_name ?? ""}
            </p>
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Sisa piutang: <b>{formatRupiah(payTarget.total - payTarget.paid)}</b>
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Jumlah Bayar (Rp)</label>
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
                {paying ? "Memproses..." : "Bayar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
