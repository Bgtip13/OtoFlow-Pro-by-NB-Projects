"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotaPrint from "@/components/nota-print";

type Detail = {
  item_name: string;
  qty: number;
  harga_satuan: number;
  diskon: number;
  subtotal: number;
};

export default function DetailPembelianPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [inv, setInv] = useState<any>(null);
  const [details, setDetails] = useState<Detail[]>([]);
  const [company, setCompany] = useState({ company_name: "OtoFlow Pro", address: "", phone: "", logo_url: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: inv }, { data: det }, { data: s }] = await Promise.all([
        supabase.from("inbound_invoices").select("*").eq("id", params.id).single(),
        supabase.from("invoice_details").select("*").eq("invoice_type", "barang_masuk").eq("invoice_id", params.id).order("id"),
        supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      if (inv) setInv(inv);
      if (det) setDetails(det as Detail[]);
      if (s) setCompany(s as any);
      setLoading(false);
    })();
  }, [params.id, supabase]);

  if (loading) return <p className="text-sm text-slate-400">Memuat...</p>;
  if (!inv) return <p className="text-sm text-red-500">Nota tidak ditemukan.</p>;

  const lines = details.map((d) => ({
    nama: d.item_name,
    qty: d.qty,
    harga: d.harga_satuan,
    diskon: d.diskon,
    subtotal: d.subtotal,
  }));

  return (
    <div>
      <div className="print:hidden mb-4">
        <button onClick={() => router.push("/pembelian")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          ← Kembali ke Daftar
        </button>
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
