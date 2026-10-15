"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, formatDate, todayISO } from "@/lib/format";
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
import { Check, CreditCard, Filter, Wallet } from "lucide-react";

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

type StatusFilter = "all" | "belum_lunas" | "lunas";

export default function PiutangPage() {
  const supabase = createClient();
  const toast = useToast();
  const [rows, setRows] = useState<Rec[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<StatusFilter>("belum_lunas");
  const [loading, setLoading] = useState(true);
  const [outstanding, setOutstanding] = useState({ sisa: 0, jumlah: 0 });

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

    const { data: open } = await supabase.from("receivables").select("total, paid").neq("status", "lunas");
    setOutstanding({
      sisa: (open ?? []).reduce((s: number, r: any) => s + (r.total - r.paid), 0),
      jumlah: open?.length ?? 0,
    });

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

  const columns: TableColumn<Rec>[] = [
    { key: "no_nota", header: "No Nota", render: (r) => <span className="font-mono font-semibold text-slate-700">{r.sales_invoices?.no_nota ?? "-"}</span> },
    { key: "customer", header: "Pelanggan", render: (r) => r.sales_invoices?.customer_name ?? "-" },
    { key: "total", header: "Total", align: "right", render: (r) => formatRupiah(r.total) },
    { key: "paid", header: "Dibayar", align: "right", render: (r) => formatRupiah(r.paid) },
    {
      key: "sisa",
      header: "Sisa",
      align: "right",
      render: (r) => <span className="font-semibold text-slate-800">{formatRupiah(r.total - r.paid)}</span>,
    },
    {
      key: "jatuh_tempo",
      header: "Jatuh Tempo",
      render: (r) => {
        const overdue = r.status === "belum_lunas" && r.jatuh_tempo < today;
        return (
          <div className="flex flex-wrap items-center gap-1">
            <span>{formatDate(r.jatuh_tempo)}</span>
            {overdue && <Badge tone="red">Lewat</Badge>}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (r.status === "lunas" ? <Badge tone="green">Lunas</Badge> : <Badge tone="amber">Belum</Badge>),
    },
    {
      key: "__aksi",
      header: "Aksi",
      align: "right",
      className: "whitespace-nowrap",
      headerClassName: "text-right",
      render: (r) =>
        r.status === "belum_lunas" ? (
          <RowActions>
            <RowAction icon={Check} tone="blue" onClick={() => openPay(r)}>
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
      <PageHeader icon={CreditCard} title="Piutang (TOP)" subtitle={`${total} piutang`} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <StatCard label="Sisa Piutang Berjalan" value={formatRupiah(outstanding.sisa)} icon={Wallet} tone="amber" />
        <StatCard label="Nota Belum Lunas" value={outstanding.jumlah} icon={CreditCard} tone="red" />
      </div>

      <FilterBar>
        <SelectFilter<StatusFilter>
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(0);
          }}
          icon={Filter}
          ariaLabel="Filter status piutang"
          options={[
            { value: "belum_lunas", label: "Belum Lunas" },
            { value: "lunas", label: "Lunas" },
            { value: "all", label: "Semua" },
          ]}
        />
      </FilterBar>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          empty="Tidak ada piutang."
          emptyIcon={CreditCard}
          footer={<Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />}
        />
      </div>

      <PageModal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title="Bayar Piutang"
        subtitle={`${payTarget?.sales_invoices?.no_nota ?? ""} · ${payTarget?.sales_invoices?.customer_name ?? ""}`}
        maxWidth="max-w-md"
        footer={
          <>
            <Button onClick={() => setPayTarget(null)}>Batal</Button>
            <Button form="pay-form" type="submit" variant="primary" disabled={paying}>
              {paying ? "Memproses..." : "Bayar"}
            </Button>
          </>
        }
      >
        {payTarget && (
          <form id="pay-form" onSubmit={handlePay} className="space-y-3">
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-inset ring-amber-200">
              Sisa piutang: <b>{formatRupiah(payTarget.total - payTarget.paid)}</b>
            </div>
            <Field label="Jumlah Bayar (Rp)">
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
