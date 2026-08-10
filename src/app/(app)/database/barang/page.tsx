"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, todayISO } from "@/lib/format";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { Download, Package, Plus, Upload } from "lucide-react";
import * as XLSX from "xlsx";

type Item = {
  id: string;
  kode: string;
  brand: string;
  nama: string;
  het: number;
  harga_beli: number;
  harga_jual: number;
  stok_min: number;
  stok_over: number;
  stok_awal: number;
  stok: number;
};

const PAGE_SIZE = 20;
const emptyForm = {
  kode: "", brand: "", nama: "", het: "", harga_beli: "", harga_jual: "",
  stok_min: "", stok_over: "", stok_awal: "",
};

export default function BarangPage() {
  const supabase = createClient();
  const toast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importOnlyHET, setImportOnlyHET] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadItems() {
    setLoading(true);
    let query = supabase.from("items").select("*", { count: "exact" }).order("nama");
    const s = search.trim();
    if (s) {
      const like = `%${s}%`;
      query = query.or(`kode.ilike.${like},brand.ilike.${like},nama.ilike.${like}`);
    }
    const { data, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (data) {
      setItems(data as Item[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(item: Item) {
    setEditing(item);
    setForm({
      kode: item.kode,
      brand: item.brand || "",
      nama: item.nama,
      het: String(item.het),
      harga_beli: String(item.harga_beli),
      harga_jual: String(item.harga_jual),
      stok_min: String(item.stok_min),
      stok_over: String(item.stok_over),
      stok_awal: String(item.stok_awal),
    });
    setShowForm(true);
  }

  async function handleDelete(item: Item) {
    if (!window.confirm(`Hapus barang "${item.nama}"?`)) return;
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Barang dihapus.");
    loadItems();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.kode.trim() || !form.nama.trim()) {
      toast.error("Kode dan nama barang wajib diisi.");
      return;
    }
    setSaving(true);

    const payload = {
      kode: form.kode.trim(),
      brand: form.brand.trim(),
      nama: form.nama.trim(),
      het: Number(form.het) || 0,
      harga_beli: Number(form.harga_beli) || 0,
      harga_jual: Number(form.harga_jual) || 0,
      stok_min: Number(form.stok_min) || 0,
      stok_over: Number(form.stok_over) || 0,
      stok_awal: Number(form.stok_awal) || 0,
    };

    if (editing) {
      const { error } = await supabase.from("items").update(payload).eq("id", editing.id);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      toast.success("Barang diperbarui.");
    } else {
      const { error } = await supabase
        .from("items")
        .insert({ ...payload, stok: payload.stok_awal, avg_harga_beli: payload.harga_beli });
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      toast.success("Barang ditambahkan.");
    }

    setSaving(false);
    setShowForm(false);
    loadItems();
  }

  async function handleImportFile(file: File) {
    setImporting(true);

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    const parsed: {
      kode: string; brand: string; nama: string; het: number; hargaBeli: number;
      hargaJual: number; stokMin: number; stokOver: number; stokAwal: number;
    }[] = [];
    for (const r of rows) {
      const kode = String(r["Kode"] ?? "").trim();
      const nama = String(r["Nama Barang"] ?? r["nama"] ?? "").trim();
      if (!kode || !nama) continue;
      parsed.push({
        kode,
        brand: String(r["Brand"] ?? "").trim(),
        nama,
        het: Number(r["HET"]) || 0,
        hargaBeli: Number(r["Harga Beli"]) || 0,
        hargaJual: Number(r["Harga Jual"]) || 0,
        stokMin: Number(r["Stok Minimal"]) || 0,
        stokOver: Number(r["Stok Over"]) || 0,
        stokAwal: Number(r["Stok Awal"]) || 0,
      });
    }

    if (parsed.length === 0) {
      toast.error("File kosong atau format tidak sesuai.");
      setImporting(false);
      return;
    }

    const kodeList = [...new Set(parsed.map((p) => p.kode))];
    const existingMap = new Map<string, Record<string, any>>();
    for (let i = 0; i < kodeList.length; i += 1000) {
      const chunk = kodeList.slice(i, i + 1000);
      const { data } = await supabase.from("items").select("*").in("kode", chunk);
      if (data) {
        for (const d of data) existingMap.set(d.kode, d);
      }
    }

    let updated = 0;
    let inserted = 0;
    let skipped = 0;
    const mutations: any[] = [];

    for (const p of parsed) {
      const f = existingMap.get(p.kode);
      if (f) {
        if (importOnlyHET && f.nama === p.nama) {
          const patch: Record<string, unknown> = {
            het: p.het,
            harga_beli: p.hargaBeli || f.harga_beli,
            harga_jual: p.hargaJual || f.harga_jual,
          };
          if (p.brand) patch.brand = p.brand;
          const { error } = await supabase.from("items").update(patch).eq("id", f.id);
          if (!error) updated++;
          else skipped++;
        } else {
          skipped++;
        }
      } else {
        if (importOnlyHET) {
          skipped++;
        } else {
          const { data: ins, error } = await supabase
            .from("items")
            .insert({
              kode: p.kode,
              brand: p.brand,
              nama: p.nama,
              het: p.het,
              harga_beli: p.hargaBeli,
              avg_harga_beli: p.hargaBeli,
              harga_jual: p.hargaJual,
              stok_min: p.stokMin,
              stok_over: p.stokOver,
              stok_awal: p.stokAwal,
              stok: p.stokAwal,
            })
            .select("id")
            .single();
          if (ins && !error) {
            inserted++;
            mutations.push({
              item_id: ins.id,
              tanggal: todayISO(),
              jenis: "masuk",
              qty: p.stokAwal,
              stok_sebelum: 0,
              stok_sesudah: p.stokAwal,
              ref_type: "import",
              note: "Stok awal (import)",
            });
          } else {
            skipped++;
          }
        }
      }
    }

    if (mutations.length > 0) {
      await supabase.from("stock_mutations").insert(mutations);
    }

    toast.success(`Import selesai! Diperbarui: ${updated} | Ditambahkan: ${inserted} | Dilewati: ${skipped}`);
    setImporting(false);
    setShowImport(false);
    if (fileRef.current) fileRef.current.value = "";
    loadItems();
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Kode", "Brand", "Nama Barang", "HET", "Harga Beli", "Harga Jual", "Stok Minimal", "Stok Over", "Stok Awal"],
      ["OLI-001", "Yamalube", "Oli Mesin Matic 800ml", "45000", "38000", "42000", "10", "100", "0"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Barang");
    XLSX.writeFile(wb, "format-impor-barang.xlsx");
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader icon={Package} title="Database Barang" subtitle={`Total ${total} barang`}>
        <button onClick={downloadTemplate} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          <Download className="h-3.5 w-3.5" /> Format Impor
        </button>
        <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100">
          <Upload className="h-3.5 w-3.5" /> Impor Excel
        </button>
        <button onClick={openNew} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
          <Plus className="h-3.5 w-3.5" /> Barang Baru
        </button>
      </PageHeader>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
        placeholder="Cari kode / brand / nama barang..."
        className="mt-4 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />

      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <th className="px-3 py-2">Kode</th>
              <th className="px-3 py-2">Brand</th>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2 text-right">HET</th>
              <th className="px-3 py-2 text-right">Harga Beli</th>
              <th className="px-3 py-2 text-right">Harga Jual</th>
              <th className="px-3 py-2 text-right">Stok</th>
              <th className="px-3 py-2 text-right">Stok Min</th>
              <th className="px-3 py-2 text-right">Stok Over</th>
              <th className="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-400">Memuat...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-400">Belum ada data.</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{r.kode}</td>
                  <td className="px-3 py-2 text-slate-500">{r.brand || "-"}</td>
                  <td className="px-3 py-2">{r.nama}</td>
                  <td className="px-3 py-2 text-right">{formatRupiah(r.het)}</td>
                  <td className="px-3 py-2 text-right">{formatRupiah(r.harga_beli)}</td>
                  <td className="px-3 py-2 text-right">{formatRupiah(r.harga_jual)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{r.stok}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{r.stok_min}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{r.stok_over}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(r)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(r)} className="ml-2 text-red-600 hover:underline">Hapus</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Halaman {page + 1} dari {totalPages}</span>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">← Sebelumnya</button>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">Berikutnya →</button>
        </div>
      </div>

      {/* MODAL FORM */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800">{editing ? "Edit Barang" : "Barang Baru"}</h2>
            <form onSubmit={handleSave} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Kode *</label>
                <input value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} placeholder="Contoh: OLI-001"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Brand</label>
                <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Contoh: AHM, Yamalube"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Nama Barang *</label>
                <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama barang"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">HET</label>
                <input type="number" value={form.het} onChange={(e) => setForm({ ...form, het: e.target.value })} placeholder="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Harga Beli</label>
                <input type="number" value={form.harga_beli} onChange={(e) => setForm({ ...form, harga_beli: e.target.value })} placeholder="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Harga Jual</label>
                <input type="number" value={form.harga_jual} onChange={(e) => setForm({ ...form, harga_jual: e.target.value })} placeholder="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Stok Minimal</label>
                <input type="number" value={form.stok_min} onChange={(e) => setForm({ ...form, stok_min: e.target.value })} placeholder="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Stok Over (batas)</label>
                <input type="number" value={form.stok_over} onChange={(e) => setForm({ ...form, stok_over: e.target.value })} placeholder="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Stok Awal</label>
                <input type="number" value={form.stok_awal} onChange={(e) => setForm({ ...form, stok_awal: e.target.value })} placeholder="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="flex items-end justify-end gap-2 sm:col-span-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORT */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowImport(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800">Impor Excel</h2>
            <p className="text-sm text-slate-500">Gunakan file dari tombol "📥 Format Impor" agar terbaca sistem.</p>

            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportFile(f);
                }}
              />
              <span className="text-sm font-medium text-blue-600">Pilih File Excel</span>
            </label>

            <label className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 p-3">
              <input type="checkbox" checked={importOnlyHET} onChange={(e) => setImportOnlyHET(e.target.checked)} className="mt-0.5" />
              <span className="text-xs text-slate-600">
                <b>Centang (aktif):</b> mode update HET — hanya memperbarui harga barang yang sudah ada, barang baru tidak masuk.
                <br />
                <b>Hilangkan centang:</b> mode tambah — barang baru dimasukkan, kode yang sudah ada dilewati.
              </span>
            </label>

            {importing && <p className="mt-3 text-sm text-slate-500">Memproses file...</p>}

            <div className="mt-5 flex justify-end">
              <button onClick={() => setShowImport(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
