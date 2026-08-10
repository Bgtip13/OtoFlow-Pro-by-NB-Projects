"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, todayISO } from "@/lib/format";
import { useToast } from "@/components/toast";
import { generateNoNota } from "@/lib/nota";
import { prepareInboundForResave } from "@/lib/invoice-utils";

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

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supSearch, setSupSearch] = useState("");
  const [supResults, setSupResults] = useState<Supplier[]>([]);
  const [supMode, setSupMode] = useState<"search" | "new">("search");
  const [newSup, setNewSup] = useState({ nama: "", no_hp: "", alamat: "" });
  const [savingSup, setSavingSup] = useState(false);

  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const q = new URLSearchParams(window.location.search);
      const editId = q.get("id");
      if (editId) setEditingId(editId);

      if (editId) {
        const { data: inv } = await supabase.from("inbound_invoices").select("*").eq("id", editId).single();
        if (inv) {
          setLoadedNo(inv.no_nota);
          setNoNota(inv.no_nota);
          setNote(inv.note || "");
          if (inv.supplier_id) {
            const { data: s } = await supabase.from("suppliers").select("*").eq("id", inv.supplier_id).single();
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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cari supplier
  useEffect(() => {
    if (!supSearch.trim()) { setSupResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("suppliers").select("*").ilike("nama", `%${supSearch.trim()}%`).limit(8);
      if (data) setSupResults(data as Supplier[]);
    }, 300);
    return () => clearTimeout(t);
  }, [supSearch, supabase]);

  // Cari barang
  useEffect(() => {
    if (!itemSearch.trim()) { setItemResults([]); return; }
    const t = setTimeout(async () => {
      const like = `%${itemSearch.trim()}%`;
      const { data } = await supabase.from("items").select("*").or(`kode.ilike.${like},nama.ilike.${like}`).limit(8);
      if (data) setItemResults(data as Item[]);
    }, 300);
    return () => clearTimeout(t);
  }, [itemSearch, supabase]);

  function addToCart(it: Item) {
    const key = `barang-${it.id}`;
    setCart((prev) => {
      const ex = prev.find((l) => l.key === key);
      if (ex) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, {
        key, ref_id: it.id, kode: it.kode, nama: it.nama, het: it.het,
        qty: 1, hargaBeli: it.het, diskon: 0,
      }];
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

  async function saveSupplier() {
    setSavingSup(true);
    if (!newSup.nama.trim()) {
      toast.error("Nama supplier wajib diisi.");
      setSavingSup(false);
      return;
    }
    const { data, error } = await supabase
      .from("suppliers")
      .insert({ nama: newSup.nama.trim(), no_hp: newSup.no_hp.trim(), alamat: newSup.alamat.trim() })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      setSavingSup(false);
      return;
    }
    setSupplier(data as Supplier);
    setNewSup({ nama: "", no_hp: "", alamat: "" });
    setSupMode("search");
    setSupSearch("");
    setSupResults([]);
    toast.success("Supplier baru ditambahkan.");
    setSavingSup(false);
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
        const { data: inv, error: errUpd } = await supabase
          .from("inbound_invoices")
          .update({
            supplier_id: supplier?.id ?? null,
            supplier_name: supplier?.nama ?? "",
            total,
            note,
          })
          .eq("id", editingId)
          .select()
          .single();
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

      for (const l of cart) {
        await supabase.from("invoice_details").insert({
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

        // Update stok + rata-rata harga beli
        const { data: cur } = await supabase.from("items").select("stok, avg_harga_beli").eq("id", l.ref_id).single();
        const oldStok = cur?.stok ?? 0;
        const oldAvg = cur?.avg_harga_beli ?? 0;
        const newStok = oldStok + l.qty;
        const newAvg = newStok > 0 ? (oldAvg * oldStok + l.hargaBeli * l.qty) / newStok : l.hargaBeli;
        await supabase
          .from("items")
          .update({ stok: newStok, avg_harga_beli: newAvg, harga_beli: l.hargaBeli })
          .eq("id", l.ref_id);

        await supabase.from("stock_mutations").insert({
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

      toast.success(`Pembelian ${no} berhasil ${editingId ? "diperbarui" : "dibuat"}.`);
      router.push("/pembelian");
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`);
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{editingId ? "Edit Pembelian" : "Pembelian Barang Masuk"}</h1>
          <p className="text-sm text-slate-500">No nota: <span className="font-mono font-semibold text-blue-600">{noNota}</span></p>
        </div>
        <button onClick={() => router.push("/pembelian")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">← Kembali</button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Supplier */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">Supplier</h2>
              {supplier ? (
                <button onClick={() => setSupplier(null)} className="text-xs text-red-600 hover:underline">Ganti ({supplier.nama})</button>
              ) : (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Belum dipilih</span>
              )}
            </div>

            {!supplier && supMode === "search" && (
              <div className="mt-3">
                <input value={supSearch} onChange={(e) => setSupSearch(e.target.value)} placeholder="Cari nama supplier..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                {supResults.length > 0 && (
                  <ul className="mt-2 rounded-lg border border-slate-200">
                    {supResults.map((s) => (
                      <li key={s.id}>
                        <button onClick={() => { setSupplier(s); setSupSearch(""); setSupResults([]); }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                          <span className="font-medium">{s.nama}</span>
                          <span className="ml-2 text-xs text-slate-400">{s.no_hp}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button onClick={() => setSupMode("new")} className="mt-2 text-xs font-semibold text-blue-600 hover:underline">+ Supplier tidak ada? Daftarkan</button>
              </div>
            )}

            {!supplier && supMode === "new" && (
              <div className="mt-3 space-y-2">
                <input value={newSup.nama} onChange={(e) => setNewSup({ ...newSup, nama: e.target.value })} placeholder="Nama supplier *"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                <input value={newSup.no_hp} onChange={(e) => setNewSup({ ...newSup, no_hp: e.target.value })} placeholder="No HP"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                <input value={newSup.alamat} onChange={(e) => setNewSup({ ...newSup, alamat: e.target.value })} placeholder="Alamat"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={saveSupplier} disabled={savingSup} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {savingSup ? "Menyimpan..." : "Simpan & Pilih"}
                  </button>
                  <button onClick={() => setSupMode("search")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">Batal</button>
                </div>
              </div>
            )}

            {supplier && (
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">{supplier.nama}</span>
                <span className="ml-2 text-xs text-slate-400">{supplier.no_hp} · {supplier.alamat}</span>
              </div>
            )}
          </div>

          {/* Pilih barang */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-700">Pilih Barang</h2>
            <input value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="Ketik kode / nama barang..."
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            {itemResults.length > 0 && (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                {itemResults.map((it) => (
                  <li key={it.id}>
                    <button onClick={() => addToCart(it)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <span>
                        <span className="font-mono text-xs text-slate-400">{it.kode}</span>{" "}
                        <span className="font-medium">{it.nama}</span>
                      </span>
                      <span className="text-xs text-slate-500">HET {formatRupiah(it.het)} · stok {it.stok}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Keranjang */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-700">Daftar Barang ({cart.length})</h2>
            {cart.length === 0 ? (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">Belum ada barang. Klik barang di pencarian.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-2 py-1.5">Barang</th>
                      <th className="px-2 py-1.5 w-14">Qty</th>
                      <th className="px-2 py-1.5 w-24">HET</th>
                      <th className="px-2 py-1.5 w-28">Harga Beli</th>
                      <th className="px-2 py-1.5 w-24">Diskon %</th>
                      <th className="px-2 py-1.5 text-right">Subtotal</th>
                      <th className="px-2 py-1.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((l) => (
                      <tr key={l.key} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-1.5">
                          <div className="font-medium">{l.nama}</div>
                          <div className="font-mono text-[10px] text-slate-400">{l.kode}</div>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min={1} value={l.qty} onChange={(e) => updateQty(l.key, Number(e.target.value))}
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right focus:border-blue-500 focus:outline-none" />
                        </td>
                        <td className="px-2 py-1.5 text-right">{formatRupiah(l.het)}</td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={l.hargaBeli} onChange={(e) => setHargaBeli(l.key, Number(e.target.value))}
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right focus:border-blue-500 focus:outline-none" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={Math.round(l.diskon * 100) / 100} onChange={(e) => setDiskon(l.key, Number(e.target.value))}
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right focus:border-blue-500 focus:outline-none" />
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold">{formatRupiah(l.qty * l.hargaBeli)}</td>
                        <td className="px-2 py-1.5 text-right">
                          <button onClick={() => removeLine(l.key)} className="text-red-600 hover:underline">✕</button>
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
          </div>
        </div>

        {/* Ringkasan */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-700">Ringkasan</h2>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-slate-600">Catatan</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="font-bold text-slate-800">TOTAL</span>
              <span className="text-xl font-bold text-blue-700">{formatRupiah(total)}</span>
            </div>
            <button onClick={handleSave} disabled={saving || cart.length === 0}
              className="mt-4 w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Menyimpan..." : `Simpan Pembelian (${formatRupiah(total)})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
