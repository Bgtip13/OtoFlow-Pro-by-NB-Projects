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

export default function DetailServisPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [inv, setInv] = useState<any>(null);
  const [details, setDetails] = useState<Detail[]>([]);
  const [cust, setCust] = useState<any>(null);
  const [company, setCompany] = useState({
    company_name: "OtoFlow Pro", address: "", phone: "", logo_url: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: inv } = await supabase.from("service_invoices").select("*").eq("id", params.id).single();
      if (inv) {
        setInv(inv);
        if (inv.customer_id) {
          const { data: c } = await supabase.from("service_customers").select("*").eq("id", inv.customer_id).single();
          if (c) setCust(c);
        }
      }
      const [{ data: det }, { data: s }] = await Promise.all([
        supabase.from("invoice_details").select("*").eq("invoice_type", "servis").eq("invoice_id", params.id).order("id"),
        supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      ]);
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
        <button onClick={() => router.push("/servis")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          ← Kembali ke Daftar
        </button>
      </div>
      <NotaPrint
        company={company}
        title="Nota Servis"
        noNota={inv.no_nota}
        tanggal={inv.tanggal}
        customerLabel={inv.customer_name}
        statusLabel={inv.status === "selesai" ? "SELESAI" : "PENGERJAAN"}
        lines={lines}
        subtotal={inv.subtotal}
        diskon={inv.diskon}
        total={inv.total}
        note={inv.note}
        extra={
          <>
            <div className="flex justify-between"><span>Mekanik</span><span className="font-semibold">{inv.mechanic_name}</span></div>
            {cust && (
              <>
                <div className="flex justify-between"><span>Motor</span><span>{cust.jenis_motor}</span></div>
                <div className="flex justify-between"><span>Plat</span><span>{cust.plat_nomor}</span></div>
              </>
            )}
          </>
        }
      />
    </div>
  );
}
