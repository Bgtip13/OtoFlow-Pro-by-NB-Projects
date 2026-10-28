"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah } from "@/lib/format";
import { useDebouncedValue, useRequestGuard } from "@/lib/hooks";
import { downloadExcel, readExcelRows } from "@/lib/excel";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { FilterBar, SearchInput } from "@/components/filter-bar";
import {
  Button,
  DataTable,
  Field,
  Input,
  PageModal,
  Pagination,
  RowAction,
  RowActions,
  Select,
  StatCard,
  type TableColumn,
} from "@/components/ui";
import { Cog, Download, FileSpreadsheet, Plus, Upload } from "lucide-react";

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
  const guard = useRequestGuard();

  const [items, setItems] = useState<Service[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);

  async function loadItems() {
    const requestId = guard.next();
    setLoading(true);

    let query = supabase.from("services").select("*", { count: "exact" }).order("nama");
    const s = debouncedSearch.trim();
    if (s) query = query.ilike("nama", `%${s.replace(/[",()]/g, " ")}%`);

    const { data, count, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (!guard.isCurrent(requestId)) return;
    if (error) toast.error(`Gagal memuat jasa: ${error.message}`);
    if (data) {
      setItems(data as Service[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

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

    const payload = {
      nama: form.nama.trim(),
      harga: Number(form.harga) || 0,
      komisi_tipe: form.komisi_tipe,
      komisi_nilai: Number(form.komisi_nilai) || 0,
    };

    if (!payload.nama) {
      toast.error("Nama jasa wajib diisi.");
      return;
    }

    setSaving(true);
    const { error } = editing
      ? await supabase.from("services").update(payload).eq("id", editing.id)
      : await supabase.from("services").insert(payload);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Jasa berhasil diperbarui." : "Jasa baru berhasil ditambahkan.");
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

  async function downloadTemplate() {
    try {
      await downloadExcel(
        ["Nama Jasa", "Harga", "Tipe Komisi", "Nilai Komisi"],
        [
          ["Servis Ringan", 50000, "nominal", 10000],
          ["Ganti Oli", 25000, "persen", 20],
        ],
        "Jasa",
        "format-impor-jasa.xlsx"
      );
    } catch {
      toast.error("Gagal membuat file contoh.");
    }
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const rows = await readExcelRows(file);

      const parsed: { nama: string; harga: number; komisi_tipe: "persen" | "nominal"; komisi_nilai: number }[] = [];

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
        return;
      }

      const { error } = await supabase.from("services").upsert(parsed, { onConflict: "nama" });
      if (error) {
        toast.error(`Gagal: ${error.message}`);
        return;
      }

      toast.success(`Import selesai! ${parsed.length} jasa diproses.`);
      setShowImport(false);
      setPage(0);
      loadItems();
    } catch (e: any) {
      toast.error(`Gagal membaca file: ${e.message}`);
    } finally {
      setImporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns: TableColumn<Service>[] = [
    { key: "nama", header: "Nama Jasa", render: (r) => <span className="font-semibold text-slate-800">{r.nama}</span> },
    { key: "harga", header: "Harga", align: "right", render: (r) => formatRupiah(r.harga) },
    { key: "komisi", header: "Komisi Mekanik", align: "right", render: (r) => <span className="font-medium text-amber-600">{komisiLabel(r)}</span> },
    {
      key: "__aksi",
      header: "Aksi",
      align: "right",
      className: "whitespace-nowrap",
      headerClassName: "text-right",
      render: (r) => (
        <RowActions>
          <RowAction tone="blue" onClick={() => openEdit(r)}>
            Edit
          </RowAction>
          <RowAction tone="red" onClick={() => handleDelete(r)}>
            Hapus
          </RowAction>
        </RowActions>
      ),
    },
  ];

  return (
    <div>
      <PageHeader icon={Cog} title="Database Jasa" subtitle={`${total} jenis jasa`}>
        <Button icon={Download} size="sm" onClick={downloadTemplate}>
          Format Impor
        </Button>
        <Button icon={Upload} size="sm" variant="secondary" onClick={() => setShowImport(true)}>
          Impor Excel
        </Button>
        <Button icon={Plus} size="sm" variant="primary" onClick={openNew}>
          Jasa Baru
        </Button>
      </PageHeader>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Jasa" value={total} icon={Cog} tone="blue" />
      </div>

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Cari nama jasa..."
        />
      </FilterBar>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(r) => r.id}
          loading={loading}
          empty="Belum ada jasa."
          emptyIcon={Cog}
          footer={<Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />}
        />
      </div>

      <PageModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Jasa" : "Jasa Baru"}
        subtitle="Nama jasa wajib diisi."
        footer={
          <>
            <Button onClick={() => setShowForm(false)}>Batal</Button>
            <Button form="jasa-form" type="submit" variant="primary" loading={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </>
        }
      >
        <form id="jasa-form" onSubmit={handleSave} className="space-y-3">
          <Field label="Nama Jasa *">
            <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Contoh: Servis Ringan" />
          </Field>
          <Field label="Harga Jasa">
            <Input type="number" value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Tipe Komisi Mekanik">
            <Select
              value={form.komisi_tipe}
              onChange={(e) => setForm({ ...form, komisi_tipe: e.target.value as "persen" | "nominal" })}
            >
              <option value="nominal">Nominal (Rp)</option>
              <option value="persen">Persen (%)</option>
            </Select>
          </Field>
          <Field
            label="Nilai Komisi"
            hint={form.komisi_tipe === "persen" ? "Contoh: 20 berarti 20% dari harga jasa." : "Nominal rupiah per pekerjaan."}
          >
            <Input type="number" value={form.komisi_nilai} onChange={(e) => setForm({ ...form, komisi_nilai: e.target.value })} placeholder="0" />
          </Field>
        </form>
      </PageModal>

      <PageModal
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Impor Excel"
        subtitle='Gunakan file dari tombol "Format Impor". Jasa dengan nama sama akan diperbarui (tidak dobel).'
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
