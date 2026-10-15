"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { FilterBar, SearchInput } from "@/components/filter-bar";
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
  type TableColumn,
} from "@/components/ui";
import { Download, FileSpreadsheet, Pencil, Plus, Trash2, Upload, type LucideIcon } from "lucide-react";
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

  const tableColumns: TableColumn<any>[] = [
    ...columns.map((c) => ({
      key: c.key,
      header: c.label,
      render: (r: any) => <span className="font-medium text-slate-700">{r[c.key] || "-"}</span>,
    })),
    {
      key: "__aksi",
      header: "Aksi",
      align: "right" as const,
      className: "whitespace-nowrap",
      headerClassName: "text-right",
      render: (r: any) => (
        <RowActions>
          <RowAction icon={Pencil} tone="blue" onClick={() => openEdit(r)}>
            Edit
          </RowAction>
          <RowAction icon={Trash2} tone="red" onClick={() => handleDelete(r)}>
            Hapus
          </RowAction>
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader icon={icon} title={title} subtitle={`Total ${total} ${itemLabel.toLowerCase()}`}>
        <Button icon={Download} size="sm" onClick={downloadTemplate}>
          Format Impor
        </Button>
        <Button icon={Upload} size="sm" variant="secondary" onClick={() => setShowImport(true)}>
          Impor Excel
        </Button>
        <Button icon={Plus} size="sm" variant="primary" onClick={openNew}>
          {itemLabel} Baru
        </Button>
      </PageHeader>

      <FilterBar>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Cari data..." />
        <span className="hidden text-xs text-slate-400 sm:inline">
          Cari berdasarkan {searchKeys.map((k) => columns.find((c) => c.key === k)?.label ?? k).join(", ")}
        </span>
      </FilterBar>

      <div className="mt-4">
        <DataTable
          columns={tableColumns}
          rows={items}
          rowKey={(r) => r.id}
          loading={loading}
          empty={`Belum ada ${itemLabel.toLowerCase()}.`}
          emptyIcon={icon}
          footer={<Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />}
        />
      </div>

      {/* MODAL FORM */}
      <PageModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? `Edit ${itemLabel}` : `${itemLabel} Baru`}
        subtitle="Lengkapi data di bawah lalu simpan."
        footer={
          <>
            <Button onClick={() => setShowForm(false)}>Batal</Button>
            <Button form="crud-form" type="submit" variant="primary" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </>
        }
      >
        <form id="crud-form" onSubmit={handleSave} className="space-y-3">
          {columns.map((c) => (
            <Field key={c.key} label={c.required ? `${c.label} *` : c.label}>
              <Input
                value={form[c.key] ?? ""}
                onChange={(e) => setForm({ ...form, [c.key]: e.target.value })}
              />
            </Field>
          ))}
        </form>
      </PageModal>

      {/* MODAL IMPORT */}
      <PageModal
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Impor Excel"
        subtitle={`Gunakan file dari tombol "Format Impor". Data dengan ${uniqueKey} sama akan diperbarui (tidak dobel).`}
        footer={<Button onClick={() => setShowImport(false)}>Tutup</Button>}
      >
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/50">
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
          <FileSpreadsheet className="h-7 w-7 text-blue-500" />
          <span className="text-sm font-semibold text-blue-600">Pilih File Excel</span>
          <span className="text-xs text-slate-400">.xlsx atau .xls</span>
        </label>
        {importing && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
            <Badge tone="blue">Proses</Badge> Memproses file...
          </div>
        )}
      </PageModal>
    </div>
  );
}
