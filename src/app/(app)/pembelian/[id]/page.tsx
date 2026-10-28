"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotaPrint from "@/components/nota-print";
import { ArrowLeft } from "lucide-react";

type Detail = {
  item_name: string;
  qty: number;
  harga_satuan: number;
  diskon: number;
  subtotal: number;
};

export default function DetailPembelianPage() {
  const params = useParams<{ id: string }>();
  const supabase = createClient();

  const [inv, setInv] = useState<any>(null);
  const [details, setDetails] = useState<Detail[]>([]);
  const [company, setCompany] = useState({ company_name: "OtoFlow Pro", address: "", phone: "", logo_url: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: inv }, { data: det }, { data: s }] = await Promise.all([
        supabase.from("inbound_invoices").select("*").eq("id", params.id).maybeSingle(),
        supabase
          .from("invoice_details")
          .select("*")
          .eq("invoice_type", "barang_masuk")
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

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 print:hidden">
        <Link
          href="/pembelian"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Nota {inv.no_nota}</h1>
          <p className="text-xs text-slate-400">{inv.supplier_name || "-"}</p>
        </div>
      </div>

      <NotaPrint
        company={company}
        title="Nota Pembelian"
        noNota={inv.no_nota}
        tanggal={inv.tanggal}
        customerLabel={inv.supplier_name || "-"}
        lines={lines}
        subtotal={inv.total}
        diskon={0}
        total={inv.total}
        note={inv.note}
      />
    </div>
  );
}
