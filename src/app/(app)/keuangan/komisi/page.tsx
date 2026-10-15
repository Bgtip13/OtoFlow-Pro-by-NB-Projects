"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, todayISO } from "@/lib/format";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { FilterBar, SelectFilter } from "@/components/filter-bar";
import {
  Badge,
  Button,
  DataTable,
  Field,
  Input,
  PageModal,
  Pagination,
  RowAction,
  RowActions,
  StatCard,
  type TableColumn,
} from "@/components/ui";
import { Check, Filter, HandCoins, Wallet } from "lucide-react";

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

type StatusFilter = "all" | "belum_dibayar" | "lunas";

export default function KomisiPage() {
  const supabase = createClient();
  const toast = useToast();
  const [rows, setRows] = useState<Comm[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<StatusFilter>("belum_dibayar");
  const [loading, setLoading] = useState(true);
  const [outstanding, setOutstanding] = useState({ jumlah: 0, count: 0 });

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

    const { data: open } = await supabase.from("mechanic_commissions").select("jumlah").eq("status", "belum_dibayar");
    setOutstanding({
      jumlah: (open ?? []).reduce((s: number, r: any) => s + r.jumlah, 0),
      count: open?.length ?? 0,
    });

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

  const columns: TableColumn<Comm>[] = [
    { key: "no_nota", header: "No Nota Servis", render: (c) => <span className="font-mono font-semibold text-slate-700">{c.service_invoices?.no_nota ?? "-"}</span> },
    { key: "customer", header: "Pelanggan", render: (c) => c.service_invoices?.customer_name ?? "-" },
    { key: "mechanic", header: "Mekanik", render: (c) => c.mechanics?.nama ?? "-" },
    { key: "jumlah", header: "Komisi", align: "right", render: (c) => <span className="font-semibold text-slate-800">{formatRupiah(c.jumlah)}</span> },
    {
      key: "status",
      header: "Status",
      render: (c) => (c.status === "lunas" ? <Badge tone="green">Lunas</Badge> : <Badge tone="amber">Belum</Badge>),
    },
    {
      key: "__aksi",
      header: "Aksi",
      align: "right",
      className: "whitespace-nowrap",
      headerClassName: "text-right",
      render: (c) =>
        c.status === "belum_dibayar" ? (
          <RowActions>
            <RowAction icon={Check} tone="blue" onClick={() => openPay(c)}>
              Bayar
            </RowAction>
          </RowActions>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader icon={HandCoins} title="Pembayaran Komisi Mekanik" subtitle={`${total} komisi`} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <StatCard label="Komisi Belum Dibayar" value={formatRupiah(outstanding.jumlah)} icon={Wallet} tone="amber" />
        <StatCard label="Jumlah Komisi Tertunda" value={outstanding.count} icon={HandCoins} tone="red" />
      </div>

      <FilterBar>
        <SelectFilter<StatusFilter>
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(0);
          }}
          icon={Filter}
          ariaLabel="Filter status komisi"
          options={[
            { value: "belum_dibayar", label: "Belum Dibayar" },
            { value: "lunas", label: "Sudah Dibayar" },
            { value: "all", label: "Semua" },
          ]}
        />
      </FilterBar>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(c) => c.id}
          loading={loading}
          empty="Tidak ada komisi."
          emptyIcon={HandCoins}
          footer={<Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />}
        />
      </div>

      <PageModal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title="Bayar Komisi"
        subtitle={`${payTarget?.mechanics?.nama ?? "-"} · ${payTarget?.service_invoices?.no_nota ?? ""}`}
        maxWidth="max-w-md"
        footer={
          <>
            <Button onClick={() => setPayTarget(null)}>Batal</Button>
            <Button form="komisi-form" type="submit" variant="primary" disabled={paying}>
              {paying ? "Memproses..." : "Bayar & Catat"}
            </Button>
          </>
        }
      >
        {payTarget && (
          <form id="komisi-form" onSubmit={handlePay} className="space-y-3">
            <Field label="Jumlah (Rp)">
              <Input type="number" value={payJumlah} onChange={(e) => setPayJumlah(e.target.value)} />
            </Field>
            <Field label="Catatan">
              <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Opsional" />
            </Field>
          </form>
        )}
      </PageModal>
    </div>
  );
}
