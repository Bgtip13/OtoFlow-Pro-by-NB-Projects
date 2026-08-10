"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/format";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
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

  return (
    <div>
      <PageHeader icon={ClipboardList} title="Stok Opname" subtitle="Cocokkan stok fisik dengan stok sistem">
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan Semua Penyesuaian"}
        </button>
      </PageHeader>

      <div className="mt-4">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Cari kode / nama barang..."
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-2 py-1.5">Kode</th>
              <th className="px-2 py-1.5">Nama</th>
              <th className="px-2 py-1.5 text-right">Stok Sistem</th>
              <th className="px-2 py-1.5">Stok Fisik</th>
              <th className="px-2 py-1.5 text-right">Selisih</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-400">Memuat...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-400">Tidak ada barang.</td></tr>}
            {!loading &&
              rows.map((r) => {
                const fisikVal = Number(fisik[r.id]) || 0;
                const diff = fisikVal - r.stok;
                return (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-2 py-1 font-mono">{r.kode}</td>
                    <td className="px-2 py-1 font-medium">{r.nama}</td>
                    <td className="px-2 py-1 text-right">{r.stok}</td>
                    <td className="px-2 py-1">
                      <input
                        type="number"
                        value={fisik[r.id] ?? r.stok}
                        onChange={(e) => setFisik({ ...fisik, [r.id]: e.target.value })}
                        className="w-24 rounded border border-slate-300 px-2 py-1 text-right focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className={`px-2 py-1 text-right font-semibold ${diff === 0 ? "text-slate-400" : diff > 0 ? "text-green-600" : "text-red-600"}`}>
                      {diff === 0 ? "-" : diff > 0 ? `+${diff}` : diff}
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
    </div>
  );
}
