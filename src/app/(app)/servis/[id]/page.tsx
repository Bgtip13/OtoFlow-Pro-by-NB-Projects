"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NotaPrint from "@/components/nota-print";
import { Badge, Button } from "@/components/ui";
import { ArrowLeft, Pencil } from "lucide-react";

type Detail = {
  item_name: string;
  qty: number;
  harga_satuan: number;
  diskon: number;
  subtotal: number;
};

export default function DetailServisPage() {
  const params = useParams<{ id: string }>();
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
      const [{ data: inv }, { data: det }, { data: s }] = await Promise.all([
        supabase.from("service_invoices").select("*").eq("id", params.id).maybeSingle(),
        supabase
          .from("invoice_details")
          .select("*")
          .eq("invoice_type", "servis")
          .eq("invoice_id", params.id)
          .order("id"),
        supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      ]);

      setInv(inv ?? null);
      if (det) setDetails(det as Detail[]);
      if (s) setCompany(s as any);

      if (inv?.customer_id) {
        const { data: c } = await supabase
          .from("service_customers")
          .select("nama, jenis_motor, plat_nomor")
          .eq("id", inv.customer_id)
          .maybeSingle();
        if (c) setCust(c);
      }
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/servis"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Nota {inv.no_nota}</h1>
            <div className="mt-0.5 flex items-center gap-1.5">
              {inv.status === "selesai" ? <Badge tone="green">Selesai</Badge> : <Badge tone="blue">Pengerjaan</Badge>}
              <span className="text-xs text-slate-400">{inv.customer_name || "Umum"}</span>
            </div>
          </div>
        </div>

        <Link href={`/servis/baru?id=${inv.id}`}>
          <Button icon={Pencil} size="sm">
            Edit Nota
          </Button>
        </Link>
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
