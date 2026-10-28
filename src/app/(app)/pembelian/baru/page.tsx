"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, todayISO } from "@/lib/format";
import { useToast } from "@/components/toast";
import { generateNoNota } from "@/lib/nota";
import { prepareInboundForResave } from "@/lib/invoice-utils";
import { Badge, Button, Card, CardTitle, Input } from "@/components/ui";
import { ArrowLeft, Package, PackagePlus, Plus, Search, Trash2, Truck, UserPlus } from "lucide-react";

type Supplier = { id: string; nama: string; no_hp: string; alamat: string };
type Item = { id: string; kode: string; nama: string; het: number; stok: number };
type CartLine = {
  key: string;
  ref_id: string;
  kode: string;
  nama: string;
  het: number;
  qty: number;
  hargaBeli: number;
  diskon: number; // dalam PERSEN
};

export default function PembelianBaruPage() {
  const supabase = createClient();
  const router = useRouter();
  const toast = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadedNo, setLoadedNo] = useState("");
  const [noNota, setNoNota] = useState("");
  const [ready, setReady] = useState(false);

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supSearch, setSupSearch] = useState("");
  const [supResults, setSupResults] = useState<Supplier[]>([]);
  const [supMode, setSupMode] = useState<"search" | "new">("search");
  const [newSup, setNewSup] = useState({ nama: "", no_hp: "", alamat: "" });
  const [savingSup, setSavingSup] = useState(false);

  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState<Item[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const supReq = useRef(0);
  const itemReq = useRef(0);

  useEffect(() => {
    (async () => {
      const q = new URLSearchParams(window.location.search);
      const editId = q.get("id");
      if (editId) setEditingId(editId);

      if (editId) {
        const { data: inv } = await supabase.from("inbound_invoices").select("*").eq("id", editId).maybeSingle();
        if (inv) {
          setLoadedNo(inv.no_nota);
          setNoNota(inv.no_nota);
          setNote(inv.note || "");
          if (inv.supplier_id) {
            const { data: s } = await supabase.from("suppliers").select("*").eq("id", inv.supplier_id).maybeSingle();
            if (s) setSupplier(s as Supplier);
          }
          const { data: det } = await supabase
            .from("invoice_details")
            .select("*")
            .eq("invoice_type", "barang_masuk")
            .eq("invoice_id", inv.id);
          if (det && det.length > 0) {
            const ids = det.map((d: any) => d.item_id);
            const { data: items } = await supabase.from("items").select("id, het, stok").in("id", ids);
            const itemMap = new Map((items ?? []).map((i: any) => [i.id, i]));
            setCart(
              det.map((d: any) => {
                const it = itemMap.get(d.item_id);
                const het = it?.het ?? 0;
                // diskon di DB tersimpan Rupiah -> konversi ke persen
                const diskon = het > 0 ? Math.round((d.diskon / het) * 1000) / 10 : 0;
                return {
                  key: `barang-${d.item_id}`,
                  ref_id: d.item_id,
                  kode: "",
                  nama: d.item_name,
                  het,
                  qty: d.qty,
                  hargaBeli: d.harga_satuan,
                  diskon,
                };
              })
            );
          }
        }
      } else {
        const no = await generateNoNota(supabase, "INV");
        setNoNota(no);
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cari supplier
  useEffect(() => {
    if (!supSearch.trim()) {
      setSupResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const id = ++supReq.current;
      const { data } = await supabase
        .from("suppliers")
        .select("*")
        .ilike("nama", `%${supSearch.trim()}%`)
        .limit(8);
      if (id !== supReq.current) return;
      if (data) setSupResults(data as Supplier[]);
    }, 300);
    return () => clearTimeout(t);
  }, [supSearch, supabase]);

  // Cari barang
  useEffect(() => {
    if (!itemSearch.trim()) {
      setItemResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const id = ++itemReq.current;
      const like = `%${itemSearch.trim().replace(/[",()]/g, " ")}%`;
      const { data } = await supabase
        .from("items")
        .select("id, kode, nama, het, stok")
        .or(`kode.ilike."${like}",nama.ilike."${like}"`)
        .limit(8);
      if (id !== itemReq.current) return;
      setItemResults((data ?? []) as Item[]);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [itemSearch, supabase]);

  function addToCart(it: Item) {
    const key = `barang-${it.id}`;
    setCart((prev) => {
      const ex = prev.find((l) => l.key === key);
      if (ex) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      return [
        ...prev,
        { key, ref_id: it.id, kode: it.kode, nama: it.nama, het: it.het, qty: 1, hargaBeli: it.het, diskon: 0 },
      ];
    });
    setItemSearch("");
    setItemResults([]);
  }

  // Isi harga beli -> diskon persen dihitung otomatis
  function setHargaBeli(key: string, val: number) {
    setCart((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const hargaBeli = Math.max(0, val || 0);
        const diskon = l.het > 0 ? Math.max(0, ((l.het - hargaBeli) / l.het) * 100) : 0;
        return { ...l, hargaBeli, diskon };
      })
    );
  }

  // Isi diskon persen -> harga beli dihitung otomatis
  function setDiskon(key: string, val: number) {
    setCart((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const diskon = Math.max(0, Math.min(100, val || 0));
        const hargaBeli = Math.max(0, l.het - (l.het * diskon) / 100);
        return { ...l, diskon, hargaBeli };
      })
    );
  }

  function updateQty(key: string, qty: number) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, qty: Math.max(1, qty || 1) } : l)));
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  const total = cart.reduce((s, l) => s + l.qty * l.hargaBeli, 0);
  const totalQty = cart.reduce((s, l) => s + l.qty, 0);

  async function saveSupplier() {
    if (!newSup.nama.trim()) {
      toast.error("Nama supplier wajib diisi.");
      return;
    }
    setSavingSup(true);
    const { data, error } = await supabase
      .from("suppliers")
      .insert({ nama: newSup.nama.trim(), no_hp: newSup.no_hp.trim(), alamat: newSup.alamat.trim() })
      .select()
      .single();
    setSavingSup(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSupplier(data as Supplier);
    setNewSup({ nama: "", no_hp: "", alamat: "" });
    setSupMode("search");
    setSupSearch("");
    setSupResults([]);
    toast.success("Supplier baru ditambahkan.");
  }

  async function handleSave() {
    if (cart.length === 0) {
      toast.error("Belum ada barang di nota.");
      return;
    }
    setSaving(true);
    try {
      let invId: string;
      let no: string;

      if (editingId) {
        await prepareInboundForResave(supabase, editingId);
        const { error: errUpd } = await supabase
          .from("inbound_invoices")
          .update({ supplier_id: supplier?.id ?? null, supplier_name: supplier?.nama ?? "", total, note })
          .eq("id", editingId);
        if (errUpd) throw errUpd;
        invId = editingId;
        no = loadedNo;
      } else {
        const { data: inv, error: errInv } = await supabase
          .from("inbound_invoices")
          .insert({
            no_nota: noNota,
            tanggal: todayISO(),
            supplier_id: supplier?.id ?? null,
            supplier_name: supplier?.nama ?? "",
            total,
            note,
            created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
          })
          .select()
          .single();
        if (errInv) throw errInv;
        invId = inv.id;
        no = noNota;
      }

      const mutations: Record<string, unknown>[] = [];

      for (const l of cart) {
        const { error: errD } = await supabase.from("invoice_details").insert({
          invoice_type: "barang_masuk",
          invoice_id: invId,
          item_type: "barang",
          item_id: l.ref_id,
          item_name: l.nama,
          qty: l.qty,
          harga_satuan: l.hargaBeli,
          hpp_tercatat: l.hargaBeli,
          diskon: Math.max(0, l.het - l.hargaBeli), // simpan dalam Rupiah per unit
          subtotal: l.qty * l.hargaBeli,
        });
        if (errD) throw errD;

        // Update stok + rata-rata harga beli
        const { data: cur } = await supabase
          .from("items")
          .select("stok, avg_harga_beli")
          .eq("id", l.ref_id)
          .single();
        const oldStok = cur?.stok ?? 0;
        const oldAvg = cur?.avg_harga_beli ?? 0;
        const newStok = oldStok + l.qty;
        const newAvg = newStok > 0 ? (oldAvg * oldStok + l.hargaBeli * l.qty) / newStok : l.hargaBeli;

        const { error: errS } = await supabase
          .from("items")
          .update({ stok: newStok, avg_harga_beli: newAvg, harga_beli: l.hargaBeli })
          .eq("id", l.ref_id);
        if (errS) throw errS;

        mutations.push({
          item_id: l.ref_id,
          tanggal: todayISO(),
          jenis: "masuk",
          qty: l.qty,
          stok_sebelum: oldStok,
          stok_sesudah: newStok,
          ref_type: "inbound_invoices",
          ref_id: invId,
          note: no,
        });
      }

      if (mutations.length > 0) await supabase.from("stock_mutations").insert(mutations);

      toast.success(`Pembelian ${no} berhasil ${editingId ? "diperbarui" : "dibuat"}.`);
      router.push("/pembelian");
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`);
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <div className="animate-fade-in space-y-3">
        <div className="skeleton h-9 w-56" />
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="skeleton h-64 rounded-2xl lg:col-span-2" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/pembelian")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900">
              {editingId ? "Edit Pembelian" : "Pembelian Barang Masuk"}
            </h1>
            <p className="text-[13px] text-slate-500">
              No nota: <span className="font-mono font-semibold text-blue-600">{noNota}</span>
            </p>
          </div>
        </div>
        <Badge tone={editingId ? "amber" : "blue"}>{editingId ? "Mode Edit" : "Nota Baru"}</Badge>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {/* Supplier */}
          <Card>
            <CardTitle
              icon={Truck}
              right={
                supplier ? (
                  <button onClick={() => setSupplier(null)} className="text-xs font-semibold text-red-600 hover:underline">
                    Ganti ({supplier.nama})
                  </button>
                ) : (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    Belum dipilih
                  </span>
                )
              }
            >
              Supplier
            </CardTitle>

            {!supplier && supMode === "search" && (
              <div className="mt-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={supSearch}
                    onChange={(e) => setSupSearch(e.target.value)}
                    placeholder="Cari nama supplier..."
                    className="pl-9"
                  />
                </div>
                {supResults.length > 0 && (
                  <ul className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {supResults.map((s) => (
                      <li key={s.id}>
                        <button
                          onClick={() => {
                            setSupplier(s);
                            setSupSearch("");
                            setSupResults([]);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-700">{s.nama}</span>
                          <span className="text-xs text-slate-400">{s.no_hp}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => setSupMode("new")}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Supplier belum terdaftar? Tambahkan
                </button>
              </div>
            )}

            {!supplier && supMode === "new" && (
              <div className="mt-3 space-y-2">
                <Input value={newSup.nama} onChange={(e) => setNewSup({ ...newSup, nama: e.target.value })} placeholder="Nama supplier *" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={newSup.no_hp} onChange={(e) => setNewSup({ ...newSup, no_hp: e.target.value })} placeholder="No HP" />
                  <Input value={newSup.alamat} onChange={(e) => setNewSup({ ...newSup, alamat: e.target.value })} placeholder="Alamat" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="primary" size="sm" onClick={saveSupplier} loading={savingSup}>
                    {savingSup ? "Menyimpan..." : "Simpan & Pilih"}
                  </Button>
                  <Button size="sm" onClick={() => setSupMode("search")}>
                    Batal
                  </Button>
                </div>
              </div>
            )}

            {supplier && (
              <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-inset ring-slate-100">
                <span className="font-semibold text-slate-800">{supplier.nama}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {supplier.no_hp} · {supplier.alamat}
                </span>
              </div>
            )}
          </Card>

          {/* Pilih barang */}
          <Card>
            <CardTitle icon={PackagePlus} hint="Harga beli awal mengikuti HET, bisa diubah">
              Pilih Barang
            </CardTitle>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Ketik kode / nama barang..."
                className="pl-9"
              />
            </div>

            {searching && itemSearch.trim() && <p className="mt-2 text-xs text-slate-400">Mencari…</p>}

            {itemResults.length > 0 && (
              <ul className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                {itemResults.map((it) => (
                  <li key={it.id}>
                    <button
                      onClick={() => addToCart(it)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-blue-50/60"
                    >
                      <span className="min-w-0">
                        <span className="font-mono text-[10px] text-slate-400">{it.kode}</span>{" "}
                        <span className="font-medium text-slate-700">{it.nama}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">
                        HET {formatRupiah(it.het)} · stok {it.stok}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Keranjang */}
          <Card>
            <CardTitle icon={Package} right={<Badge tone="blue">{cart.length} item</Badge>}>
              Daftar Barang
            </CardTitle>

            {cart.length === 0 ? (
              <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
                <Plus className="h-6 w-6 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">Belum ada barang</p>
                <p className="text-xs text-slate-400">Cari barang di atas lalu klik untuk menambahkan.</p>
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
                      <th className="px-2 py-2 font-bold">Barang</th>
                      <th className="w-14 px-2 py-2 font-bold">Qty</th>
                      <th className="w-24 px-2 py-2 font-bold">HET</th>
                      <th className="w-28 px-2 py-2 font-bold">Harga Beli</th>
                      <th className="w-20 px-2 py-2 font-bold">Disc %</th>
                      <th className="px-2 py-2 text-right font-bold">Subtotal</th>
                      <th className="w-8 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((l) => (
                      <tr key={l.key} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-2">
                          <div className="font-semibold text-slate-700">{l.nama}</div>
                          <div className="font-mono text-[10px] text-slate-400">{l.kode}</div>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min={1}
                            value={l.qty}
                            onChange={(e) => updateQty(l.key, Number(e.target.value))}
                            className="h-8 px-1.5 text-right text-xs"
                          />
                        </td>
                        <td className="px-2 py-2 text-right text-slate-500">{formatRupiah(l.het)}</td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            value={l.hargaBeli}
                            onChange={(e) => setHargaBeli(l.key, Number(e.target.value))}
                            className="h-8 px-1.5 text-right text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            value={Math.round(l.diskon * 100) / 100}
                            onChange={(e) => setDiskon(l.key, Number(e.target.value))}
                            className="h-8 px-1.5 text-right text-xs"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-slate-800">
                          {formatRupiah(l.qty * l.hargaBeli)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            onClick={() => removeLine(l.key)}
                            className="rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            aria-label={`Hapus ${l.nama}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[10px] text-slate-400">
                  Harga Beli &amp; Diskon (%) saling terhubung. Isi salah satu saja — diskon dihitung dari HET.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Ringkasan */}
        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardTitle icon={PackagePlus}>Ringkasan</CardTitle>
            <div className="mt-3">
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Catatan</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional" />
            </div>

            <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-[13px]">
              <span className="text-slate-500">Total Qty</span>
              <span className="font-medium text-slate-700">{totalQty} unit</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Total</span>
              <span className="text-xl font-bold tracking-tight text-blue-700">{formatRupiah(total)}</span>
            </div>

            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              disabled={cart.length === 0}
              className="mt-4 h-11 w-full"
            >
              {saving ? "Menyimpan..." : `Simpan Pembelian · ${formatRupiah(total)}`}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
