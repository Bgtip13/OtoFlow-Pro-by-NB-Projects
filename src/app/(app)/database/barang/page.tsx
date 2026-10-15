"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, todayISO } from "@/lib/format";
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
  StatCard,
  type TableColumn,
} from "@/components/ui";
import { AlertTriangle, Download, FileSpreadsheet, Package, Plus, Upload } from "lucide-react";
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
  const menipis = items.filter((r) => r.stok <= r.stok_min).length;

  const columns: TableColumn<Item>[] = [
    { key: "kode", header: "Kode", render: (r) => <span className="font-mono text-slate-500">{r.kode}</span> },
    { key: "brand", header: "Brand", render: (r) => r.brand || "-" },
    { key: "nama", header: "Nama", render: (r) => <span className="font-medium text-slate-700">{r.nama}</span> },
    { key: "het", header: "HET", align: "right", render: (r) => formatRupiah(r.het) },
    { key: "harga_beli", header: "Harga Beli", align: "right", render: (r) => formatRupiah(r.harga_beli) },
    { key: "harga_jual", header: "Harga Jual", align: "right", render: (r) => formatRupiah(r.harga_jual) },
    {
      key: "stok",
      header: "Stok",
      align: "right",
      render: (r) => (
        <span className={`font-bold ${r.stok <= r.stok_min ? "text-red-600" : "text-slate-800"}`}>{r.stok}</span>
      ),
    },
    { key: "stok_min", header: "Stok Min", align: "right", render: (r) => <span className="text-slate-400">{r.stok_min}</span> },
    { key: "stok_over", header: "Stok Over", align: "right", render: (r) => <span className="text-slate-400">{r.stok_over}</span> },
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
      <PageHeader icon={Package} title="Database Barang" subtitle={`Total ${total} barang`}>
        <Button icon={Download} size="sm" onClick={downloadTemplate}>
          Format Impor
        </Button>
        <Button icon={Upload} size="sm" variant="secondary" onClick={() => setShowImport(true)}>
          Impor Excel
        </Button>
        <Button icon={Plus} size="sm" variant="primary" onClick={openNew}>
          Barang Baru
        </Button>
      </PageHeader>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Barang" value={total} icon={Package} tone="slate" />
        <StatCard
          label="Stok Menipis"
          value={menipis}
          icon={AlertTriangle}
          tone={menipis > 0 ? "red" : "green"}
          hint="Di halaman ini"
        />
      </div>

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Cari kode / brand / nama barang..."
          className="sm:w-80"
        />
      </FilterBar>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(r) => r.id}
          loading={loading}
          empty="Belum ada data barang."
          emptyIcon={Package}
          footer={<Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />}
        />
      </div>

      {/* MODAL FORM */}
      <PageModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? "Edit Barang" : "Barang Baru"}
        subtitle="Kode dan nama barang wajib diisi."
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button onClick={() => setShowForm(false)}>Batal</Button>
            <Button form="barang-form" type="submit" variant="primary" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </>
        }
      >
        <form id="barang-form" onSubmit={handleSave} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Kode *">
            <Input value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} placeholder="Contoh: OLI-001" />
          </Field>
          <Field label="Brand">
            <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Contoh: Yamalube" />
          </Field>
          <Field label="Nama Barang *" className="sm:col-span-2">
            <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama barang" />
          </Field>
          <Field label="HET">
            <Input type="number" value={form.het} onChange={(e) => setForm({ ...form, het: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Harga Beli">
            <Input type="number" value={form.harga_beli} onChange={(e) => setForm({ ...form, harga_beli: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Harga Jual">
            <Input type="number" value={form.harga_jual} onChange={(e) => setForm({ ...form, harga_jual: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Stok Minimal">
            <Input type="number" value={form.stok_min} onChange={(e) => setForm({ ...form, stok_min: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Stok Over (batas)">
            <Input type="number" value={form.stok_over} onChange={(e) => setForm({ ...form, stok_over: e.target.value })} placeholder="0" />
          </Field>
          <Field label="Stok Awal">
            <Input type="number" value={form.stok_awal} onChange={(e) => setForm({ ...form, stok_awal: e.target.value })} placeholder="0" />
          </Field>
        </form>
      </PageModal>

      {/* MODAL IMPORT */}
      <PageModal
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Impor Excel"
        subtitle={`Gunakan file dari tombol "Format Impor" agar terbaca sistem.`}
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

        <label className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 p-3">
          <input type="checkbox" checked={importOnlyHET} onChange={(e) => setImportOnlyHET(e.target.checked)} className="mt-0.5" />
          <span className="text-xs text-slate-600">
            <b>Centang (aktif):</b> mode update HET — hanya memperbarui harga barang yang sudah ada, barang baru tidak masuk.
            <br />
            <b>Hilangkan centang:</b> mode tambah — barang baru dimasukkan, kode yang sudah ada dilewati.
          </span>
        </label>

        {importing && <p className="mt-3 text-sm text-slate-500">Memproses file...</p>}
      </PageModal>
    </div>
  );
}
