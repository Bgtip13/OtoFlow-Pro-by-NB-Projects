"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/format";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { Cog, Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import * as XLSX from "xlsx";

type Service = {
  id: string;
  nama: string;
  harga: number;
  komisi_tipe: "persen" | "nominal";
  komisi_nilai: number;
};

const PAGE_SIZE = 20;
const emptyForm = {
  nama: "",
  harga: "",
  komisi_tipe: "nominal" as "persen" | "nominal",
  komisi_nilai: "",
};

export default function JasaPage() {
  const supabase = createClient();
  const toast = useToast();
  const [items, setItems] = useState<Service[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadItems() {
    setLoading(true);
    let query = supabase.from("services").select("*", { count: "exact" }).order("nama");
    const s = search.trim();
    if (s) query = query.ilike("nama", `%${s}%`);
    const { data, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (data) {
      setItems(data as Service[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  function komisiLabel(s: Service) {
    return s.komisi_tipe === "persen" ? `${s.komisi_nilai}%` : formatRupiah(s.komisi_nilai);
  }

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(item: Service) {
    setEditing(item);
    setForm({
      nama: item.nama,
      harga: String(item.harga),
      komisi_tipe: item.komisi_tipe,
      komisi_nilai: String(item.komisi_nilai),
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      nama: form.nama.trim(),
      harga: Number(form.harga) || 0,
      komisi_tipe: form.komisi_tipe,
      komisi_nilai: Number(form.komisi_nilai) || 0,
    };

    if (!payload.nama) {
      toast.error("Nama jasa wajib diisi.");
      setSaving(false);
      return;
    }

    if (editing) {
      const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      toast.success("Jasa berhasil diperbarui.");
    } else {
      const { error } = await supabase.from("services").insert(payload);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      toast.success("Jasa baru berhasil ditambahkan.");
    }

    setSaving(false);
    setShowForm(false);
    loadItems();
  }

  async function handleDelete(item: Service) {
    if (!confirm(`Hapus jasa "${item.nama}"?`)) return;
    const { error } = await supabase.from("services").delete().eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Jasa dihapus.");
    loadItems();
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Nama Jasa": "Servis Ringan",
        Harga: 50000,
        "Tipe Komisi": "nominal",
        "Nilai Komisi": 10000,
      },
      {
        "Nama Jasa": "Ganti Oli",
        Harga: 25000,
        "Tipe Komisi": "persen",
        "Nilai Komisi": 20,
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jasa");
    XLSX.writeFile(wb, "format-impor-jasa.xlsx");
  }

  async function handleImportFile(file: File) {
    setImporting(true);

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    const parsed: {
      nama: string; harga: number; komisi_tipe: "persen" | "nominal"; komisi_nilai: number;
    }[] = [];

    for (const r of rows) {
      const nama = String(r["Nama Jasa"] ?? "").trim();
      if (!nama) continue;
      const rawTipe = String(r["Tipe Komisi"] ?? "").toLowerCase();
      parsed.push({
        nama,
        harga: Number(r["Harga"]) || 0,
        komisi_tipe: rawTipe === "persen" || rawTipe === "%" ? "persen" : "nominal",
        komisi_nilai: Number(r["Nilai Komisi"]) || 0,
      });
    }

    if (parsed.length === 0) {
      toast.error("File kosong atau format tidak sesuai.");
      setImporting(false);
      return;
    }

    const { error } = await supabase
      .from("services")
      .upsert(parsed, { onConflict: "nama" });

    if (error) {
      toast.error(`Gagal: ${error.message}`);
      setImporting(false);
      return;
    }

    toast.success(`Import selesai! ${parsed.length} jasa diproses.`);
    setImporting(false);
    setShowImport(false);
    loadItems();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader icon={Cog} title="Database Jasa" subtitle={`${total} jasa`}>
        <button onClick={downloadTemplate} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Download className="h-3.5 w-3.5" /> Format Impor
        </button>
        <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Upload className="h-3.5 w-3.5" /> Import Excel
        </button>
        <button onClick={openNew} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Jasa Baru
        </button>
      </PageHeader>

      <div className="mt-4">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Cari nama jasa..."
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-2 py-1.5">Nama Jasa</th>
              <th className="px-2 py-1.5 text-right">Harga</th>
              <th className="px-2 py-1.5 text-right">Komisi Mekanik</th>
              <th className="px-2 py-1.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="px-2 py-4 text-center text-slate-400">Memuat...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={4} className="px-2 py-4 text-center text-slate-400">Belum ada jasa.</td></tr>
            )}
            {!loading &&
              items.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-2 py-1 font-medium">{r.nama}</td>
                  <td className="px-2 py-1 text-right">{formatRupiah(r.harga)}</td>
                  <td className="px-2 py-1 text-right text-slate-600">{komisiLabel(r)}</td>
                  <td className="px-2 py-1 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(r)} className="text-blue-600 hover:underline"><Pencil className="mr-0.5 inline h-3.5 w-3.5 align-text-bottom" />Edit</button>
                    <button onClick={() => handleDelete(r)} className="ml-2 text-red-600 hover:underline"><Trash2 className="mr-0.5 inline h-3.5 w-3.5 align-text-bottom" />Hapus</button>
                  </td>
                </tr>
              ))}
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

      {/* MODAL FORM */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800">{editing ? "Edit Jasa" : "Jasa Baru"}</h2>
            <form onSubmit={handleSave} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Nama Jasa *</label>
                <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Contoh: Servis Ringan"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Harga Jasa</label>
                <input type="number" value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })} placeholder="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Tipe Komisi Mekanik</label>
                <select value={form.komisi_tipe} onChange={(e) => setForm({ ...form, komisi_tipe: e.target.value as "persen" | "nominal" })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                  <option value="nominal">Nominal (Rp)</option>
                  <option value="persen">Persen (%)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Nilai Komisi</label>
                <input type="number" value={form.komisi_nilai} onChange={(e) => setForm({ ...form, komisi_nilai: e.target.value })} placeholder="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
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
            <h2 className="text-lg font-bold text-slate-800">Import Excel</h2>
            <p className="text-sm text-slate-500">Gunakan file dari tombol "Format Impor". Jasa dengan nama sama akan diperbarui (tidak dobel).</p>
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
