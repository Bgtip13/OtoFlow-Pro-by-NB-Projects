"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/format";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { FilterBar, SearchInput } from "@/components/filter-bar";
import { Badge, Button, DataTable, Pagination, StatCard, type TableColumn } from "@/components/ui";
import { ClipboardList, Save } from "lucide-react";

const PAGE_SIZE = 20;

type Item = { id: string; kode: string; nama: string; stok: number };

export default function StokOpnamePage() {
  const supabase = createClient();
  const toast = useToast();
  const [rows, setRows] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [fisik, setFisik] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    let query = supabase.from("items").select("*", { count: "exact" }).order("nama");
    const s = search.trim();
    if (s) {
      const like = `%${s}%`;
      query = query.or(`kode.ilike.${like},nama.ilike.${like}`);
    }
    const { data, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (data) {
      setRows(data as Item[]);
      setTotal(count ?? 0);
      const f: Record<string, string> = {};
      for (const it of data) f[it.id] = String(it.stok);
      setFisik(f);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  async function handleSaveAll() {
    const changes = rows.filter((r) => Number(fisik[r.id]) !== r.stok);
    if (changes.length === 0) {
      toast.info("Tidak ada perubahan stok.");
      return;
    }
    if (!confirm(`Simpan penyesuaian stok untuk ${changes.length} barang?`)) return;

    setSaving(true);
    try {
      for (const r of changes) {
        const newStok = Math.max(0, Number(fisik[r.id]) || 0);
        const diff = newStok - r.stok;
        await supabase.from("items").update({ stok: newStok }).eq("id", r.id);
        await supabase.from("stock_mutations").insert({
          item_id: r.id,
          tanggal: todayISO(),
          jenis: "opname",
          qty: diff,
          stok_sebelum: r.stok,
          stok_sesudah: newStok,
          ref_type: "opname",
          ref_id: r.id,
          note: "Stok opname",
        });
      }
      toast.success(`Stok opname tersimpan untuk ${changes.length} barang.`);
      load();
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`);
    }
    setSaving(false);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const jumlahSelisih = rows.filter((r) => Number(fisik[r.id]) !== r.stok).length;

  const columns: TableColumn<Item>[] = [
    { key: "kode", header: "Kode", render: (r) => <span className="font-mono text-slate-500">{r.kode}</span> },
    { key: "nama", header: "Nama Barang", render: (r) => <span className="font-medium text-slate-700">{r.nama}</span> },
    { key: "stok", header: "Stok Sistem", align: "right", render: (r) => r.stok },
    {
      key: "fisik",
      header: "Stok Fisik",
      align: "right",
      render: (r) => (
        <input
          type="number"
          value={fisik[r.id] ?? r.stok}
          onChange={(e) => setFisik({ ...fisik, [r.id]: e.target.value })}
          className="h-9 w-24 rounded-lg border border-slate-300 bg-white px-2 text-right text-xs text-slate-700 transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
        />
      ),
    },
    {
      key: "selisih",
      header: "Selisih",
      align: "right",
      render: (r) => {
        const diff = (Number(fisik[r.id]) || 0) - r.stok;
        if (diff === 0) return <span className="text-slate-300">—</span>;
        return <Badge tone={diff > 0 ? "green" : "red"}>{diff > 0 ? `+${diff}` : diff}</Badge>;
      },
    },
  ];

  return (
    <div>
      <PageHeader icon={ClipboardList} title="Stok Opname" subtitle="Cocokkan stok fisik dengan stok sistem">
        <Button icon={Save} variant="primary" onClick={handleSaveAll} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Semua Penyesuaian"}
        </Button>
      </PageHeader>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Barang" value={total} icon={ClipboardList} tone="slate" />
        <StatCard label="Ada Selisih" value={jumlahSelisih} icon={ClipboardList} tone={jumlahSelisih > 0 ? "amber" : "green"} hint="Di halaman ini" />
      </div>

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Cari kode / nama barang..."
        />
      </FilterBar>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={loading}
          empty="Tidak ada barang."
          emptyIcon={ClipboardList}
          footer={<Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />}
        />
      </div>
    </div>
  );
}
