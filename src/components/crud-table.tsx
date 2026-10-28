"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import { useDebouncedValue, useRequestGuard } from "@/lib/hooks";
import { downloadExcel, readExcelRows } from "@/lib/excel";
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
  const guard = useRequestGuard();

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);

  function emptyForm() {
    const f: Record<string, string> = {};
    for (const c of columns) f[c.key] = "";
    return f;
  }

  async function load() {
    const requestId = guard.next();
    setLoading(true);

    let query = supabase.from(tableName).select("*", { count: "exact" }).order(orderBy);
    const s = debouncedSearch.trim();
    if (s) {
      const like = `%${s.replace(/[",()]/g, " ")}%`;
      query = query.or(searchKeys.map((k) => `${k}.ilike."${like}"`).join(","));
    }

    const { data, count, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (!guard.isCurrent(requestId)) return;
    if (error) toast.error(`Gagal memuat data: ${error.message}`);
    if (data) {
      setItems(data);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

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

    const { error } = editing
      ? await supabase.from(tableName).update(payload).eq("id", editing.id)
      : await supabase.from(tableName).insert(payload);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(editing ? `${itemLabel} diperbarui.` : `${itemLabel} baru ditambahkan.`);
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

  async function downloadTemplate() {
    const header = importColumns.map((c) => c.label);
    const row = importColumns.map((c) => (sampleRow?.[c.label] as string | number) ?? "");
    try {
      await downloadExcel(header, [row], itemLabel, `format-impor-${tableName}.xlsx`);
    } catch {
      toast.error("Gagal membuat file contoh.");
    }
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const rows = await readExcelRows(file);

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
        return;
      }

      const { error } = await supabase.from(tableName).upsert(parsed, { onConflict: uniqueKey });
      if (error) {
        toast.error(`Gagal: ${error.message}`);
        return;
      }

      toast.success(`Import selesai! ${parsed.length} ${itemLabel.toLowerCase()} diproses (tidak dobel).`);
      setShowImport(false);
      setPage(0);
      load();
    } catch (e: any) {
      toast.error(`Gagal membaca file: ${e.message}`);
    } finally {
      setImporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tableColumns: TableColumn<any>[] = [
    ...columns.map((c) => ({
      key: c.key,
      header: c.label,
      render: (r: any) => (
        <span className={c.key === columns[0]?.key ? "font-semibold text-slate-800" : "text-slate-600"}>
          {r[c.key] || "-"}
        </span>
      ),
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
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder={`Cari ${itemLabel.toLowerCase()}...`}
        />
        <span className="hidden items-center gap-1 text-[11px] text-slate-400 sm:flex">
          <Badge tone="slate">Tips</Badge>
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
            <Button form="crud-form" type="submit" variant="primary" loading={saving}>
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
                placeholder={c.label}
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
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/60">
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            disabled={importing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
            }}
          />
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <FileSpreadsheet className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold text-blue-600">
            {importing ? "Memproses file..." : "Pilih File Excel"}
          </span>
          <span className="text-xs text-slate-400">.xlsx atau .xls</span>
        </label>
      </PageModal>
    </div>
  );
}
