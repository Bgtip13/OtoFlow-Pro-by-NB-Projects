"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import { deleteSalesInvoice } from "@/lib/invoice-utils";
import NotaPrint from "@/components/nota-print";
import { Badge, Button } from "@/components/ui";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

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
        supabase.from("sales_invoices").select("*").eq("id", params.id).maybeSingle(),
        supabase
          .from("invoice_details")
          .select("*")
          .eq("invoice_type", "penjualan")
          .eq("invoice_id", params.id)
          .order("id"),
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

  if (loading) {
    return (
      <div className="animate-fade-in space-y-3">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton mx-auto h-[500px] w-full max-w-[210mm] rounded-2xl" />
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-medium text-red-600">
        Nota tidak ditemukan.
      </div>
    );
  }

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/penjualan"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Nota {inv.no_nota}</h1>
            <div className="mt-0.5 flex items-center gap-1.5">
              {inv.status === "lunas" ? <Badge tone="green">Lunas</Badge> : <Badge tone="amber">TOP</Badge>}
              <span className="text-xs text-slate-400">{inv.customer_name || "Umum"}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/penjualan/baru?id=${inv.id}`}>
            <Button icon={Pencil} size="sm">
              Edit Nota
            </Button>
          </Link>
          <Button
            icon={Trash2}
            size="sm"
            variant="danger"
            onClick={handleDelete}
            loading={deleting}
          >
            {deleting ? "Menghapus..." : "Hapus Nota"}
          </Button>
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
