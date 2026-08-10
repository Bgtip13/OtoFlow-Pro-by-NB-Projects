"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { Download, Pencil, Plus, Trash2, Upload, type LucideIcon } from "lucide-react";
import * as XLSX from "xlsx";

type Column = { key: string; label: string; required?: boolean };
type ImportColumn = { key: string; label: string };

const PAGE_SIZE = 20;

export default function CrudTable({
  tableName,
  title,
  itemLabel,
  icon,
  columns,
  searchKeys,
  importColumns,
  uniqueKey,
  orderBy,
  sampleRow,
}: {
  tableName: string;
  title: string;
  itemLabel: string;
  icon?: LucideIcon;
  columns: Column[];
  searchKeys: string[];
  importColumns: ImportColumn[];
  uniqueKey: string;
  orderBy: string;
  sampleRow?: Record<string, unknown>;
}) {
  const supabase = createClient();
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function emptyForm() {
    const f: Record<string, string> = {};
    for (const c of columns) f[c.key] = "";
    return f;
  }

  async function load() {
    setLoading(true);
    let query = supabase.from(tableName).select("*", { count: "exact" }).order(orderBy);
    const s = search.trim();
    if (s) {
      const like = `%${s}%`;
      query = query.or(searchKeys.map((k) => `${k}.ilike.${like}`).join(","));
    }
    const { data, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (data) {
      setItems(data);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(item: any) {
    setEditing(item);
    const f: Record<string, string> = {};
    for (const c of columns) f[c.key] = String(item[c.key] ?? "");
    setForm(f);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const required = columns.find((c) => c.required && !form[c.key]?.trim());
    if (required) {
      toast.error(`${required.label} wajib diisi.`);
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {};
    for (const c of columns) payload[c.key] = form[c.key]?.trim() ?? "";

    if (editing) {
      const { error } = await supabase.from(tableName).update(payload).eq("id", editing.id);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      toast.success(`${itemLabel} diperbarui.`);
    } else {
      const { error } = await supabase.from(tableName).insert(payload);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      toast.success(`${itemLabel} baru ditambahkan.`);
    }
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function handleDelete(item: any) {
    const name = item[columns[0]?.key] ?? itemLabel;
    if (!confirm(`Hapus ${itemLabel} "${name}"?`)) return;
    const { error } = await supabase.from(tableName).delete().eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${itemLabel} dihapus.`);
    load();
  }

  function downloadTemplate() {
    const header = importColumns.map((c) => c.label);
    const row = importColumns.map((c) => sampleRow?.[c.label] ?? "");
    const ws = XLSX.utils.aoa_to_sheet([header, row]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, itemLabel);
    XLSX.writeFile(wb, `format-impor-${tableName}.xlsx`);
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

    const parsed: Record<string, unknown>[] = [];
    for (const r of rows) {
      const row: Record<string, unknown> = {};
      let hasValue = false;
      for (const c of importColumns) {
        row[c.key] = String(r[c.label] ?? "").trim();
        if (row[c.key]) hasValue = true;
      }
      if (hasValue) parsed.push(row);
    }

    if (parsed.length === 0) {
      toast.error("File kosong atau format tidak sesuai.");
      setImporting(false);
      return;
    }

    const { error } = await supabase.from(tableName).upsert(parsed, { onConflict: uniqueKey });
    if (error) {
      toast.error(`Gagal: ${error.message}`);
      setImporting(false);
      return;
    }

    toast.success(`Import selesai! ${parsed.length} ${itemLabel.toLowerCase()} diproses (tidak dobel).`);
    setImporting(false);
    setShowImport(false);
    if (fileRef.current) fileRef.current.value = "";
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader icon={icon} title={title} subtitle={`Total ${total} ${itemLabel.toLowerCase()}`}>
        <button onClick={downloadTemplate} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          <Download className="h-3.5 w-3.5" /> Format Impor
        </button>
        <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100">
          <Upload className="h-3.5 w-3.5" /> Impor Excel
        </button>
        <button onClick={openNew} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
          <Plus className="h-3.5 w-3.5" /> {itemLabel} Baru
        </button>
      </PageHeader>

      <input
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        placeholder="Cari..."
        className="mt-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-3 py-2">{c.label}</th>
              ))}
              <th className="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={columns.length + 1} className="px-3 py-6 text-center text-slate-400">Memuat...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={columns.length + 1} className="px-3 py-6 text-center text-slate-400">Belum ada data.</td></tr>
            )}
            {!loading &&
              items.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2">{r[c.key] ?? "-"}</td>
                  ))}
                  <td className="px-3 py-2 text-right whitespace-nowrap">
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
            <h2 className="text-lg font-bold text-slate-800">{editing ? `Edit ${itemLabel}` : `${itemLabel} Baru`}</h2>
            <form onSubmit={handleSave} className="mt-4 space-y-3">
              {columns.map((c) => (
                <div key={c.key}>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    {c.label}{c.required ? " *" : ""}
                  </label>
                  <input
                    value={form[c.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))}
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
            <h2 className="text-lg font-bold text-slate-800">Impor Excel</h2>
            <p className="text-sm text-slate-500">Gunakan file dari tombol "Format Impor". Data dengan {uniqueKey} sama akan diperbarui (tidak dobel).</p>
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
