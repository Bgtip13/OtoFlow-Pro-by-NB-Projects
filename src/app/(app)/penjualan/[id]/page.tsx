"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import { deleteSalesInvoice } from "@/lib/invoice-utils";
import NotaPrint from "@/components/nota-print";
import { Pencil, Trash2 } from "lucide-react";

type Detail = {
  item_name: string;
  qty: number;
  harga_satuan: number;
  diskon: number;
  subtotal: number;
};

export default function DetailPenjualanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const supabase = createClient();

  const [inv, setInv] = useState<any>(null);
  const [details, setDetails] = useState<Detail[]>([]);
  const [company, setCompany] = useState({
    company_name: "OtoFlow Pro", address: "", phone: "", logo_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: inv }, { data: det }, { data: s }] = await Promise.all([
        supabase.from("sales_invoices").select("*").eq("id", params.id).single(),
        supabase.from("invoice_details").select("*").eq("invoice_type", "penjualan").eq("invoice_id", params.id).order("id"),
        supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      if (inv) setInv(inv);
      if (det) setDetails(det as Detail[]);
      if (s) setCompany(s as any);
      setLoading(false);
    })();
  }, [params.id, supabase]);

  async function handleDelete() {
    if (!inv) return;
    if (!confirm(`Hapus nota penjualan ${inv.no_nota}? Stok barang dikembalikan dan jurnal/piutang dibersihkan.`)) return;
    setDeleting(true);
    try {
      await deleteSalesInvoice(supabase, inv.id);
      toast.success(`Nota ${inv.no_nota} dihapus.`);
      router.push("/penjualan");
    } catch (e: any) {
      toast.error(`Gagal menghapus: ${e.message}`);
      setDeleting(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Memuat...</p>;
  if (!inv) return <p className="text-sm text-red-500">Nota tidak ditemukan.</p>;

  const lines = details.map((d) => ({
    nama: d.item_name,
    qty: d.qty,
    harga: d.harga_satuan,
    diskon: d.diskon,
    subtotal: d.subtotal,
  }));

  // Diskon total (item + nota) dihitung dari selisih agar cocok dengan TOTAL
  const diskonTotal = Math.max(0, (inv.subtotal || 0) - (inv.total || 0));

  return (
    <div>
      <div className="print:hidden mb-4 flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => router.push("/penjualan")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          ← Kembali ke Daftar
        </button>
        <div className="flex gap-2">
          <Link href={`/penjualan/baru?id=${inv.id}`} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <Pencil className="h-3.5 w-3.5" /> Edit Nota
          </Link>
          <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" /> {deleting ? "Menghapus..." : "Hapus Nota"}
          </button>
        </div>
      </div>
      <NotaPrint
        company={company}
        title="Nota Penjualan"
        noNota={inv.no_nota}
        tanggal={inv.tanggal}
        customerLabel={inv.customer_name}
        statusLabel={inv.status === "lunas" ? "LUNAS" : `TOP (Jatuh tempo ${inv.jatuh_tempo})`}
        lines={lines}
        subtotal={inv.subtotal}
        diskon={diskonTotal}
        total={inv.total}
        note={inv.note}
      />
    </div>
  );
}
