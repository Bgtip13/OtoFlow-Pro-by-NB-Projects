"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, todayISO } from "@/lib/format";
import { useToast } from "@/components/toast";
import { generateNoNota } from "@/lib/nota";
import { prepareSalesForResave } from "@/lib/invoice-utils";
import DateInput from "@/components/date-input";

type Customer = { id: string; nama: string; no_hp: string; alamat: string };
type Item = {
  id: string; kode: string; nama: string;
  harga_jual: number; harga_beli: number; avg_harga_beli: number; stok: number;
};
type CartLine = {
  item_id: string; kode: string; nama: string; qty: number;
  harga: number; diskon: number; hpp: number; stok: number;
};

export default function PenjualanBaruPage() {
  const supabase = createClient();
  const router = useRouter();
  const toast = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadedNo, setLoadedNo] = useState("");
  const [noNota, setNoNota] = useState("");
  const [hppMethod, setHppMethod] = useState<"average" | "last">("average");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [custSearch, setCustSearch] = useState("");
  const [custResults, setCustResults] = useState<Customer[]>([]);
  const [custMode, setCustMode] = useState<"search" | "new">("search");
  const [newCust, setNewCust] = useState({ nama: "", no_hp: "", alamat: "" });
  const [savingCust, setSavingCust] = useState(false);

  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);

  const [status, setStatus] = useState<"lunas" | "top">("lunas");
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [headerDiskon, setHeaderDiskon] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const q = new URLSearchParams(window.location.search);
      const editId = q.get("id");
      if (editId) setEditingId(editId);

      const { data: s } = await supabase.from("settings").select("hpp_method").eq("id", 1).maybeSingle();
      if (s) setHppMethod(s.hpp_method);
      setJatuhTempo(todayISO());

      if (editId) {
        const { data: inv } = await supabase.from("sales_invoices").select("*").eq("id", editId).single();
        if (inv) {
          setLoadedNo(inv.no_nota);
          setNoNota(inv.no_nota);
          setStatus(inv.status);
          setJatuhTempo(inv.jatuh_tempo || todayISO());
          setHeaderDiskon(String(inv.subtotal > 0 ? ((inv.diskon || 0) / inv.subtotal) * 100 : 0));
          setNote(inv.note || "");
          if (inv.customer_id) {
            const { data: c } = await supabase.from("sales_customers").select("*").eq("id", inv.customer_id).single();
            if (c) setCustomer(c as Customer);
          }
          const { data: det } = await supabase
            .from("invoice_details")
            .select("*")
            .eq("invoice_type", "penjualan")
            .eq("invoice_id", inv.id);
          if (det && det.length > 0) {
            const ids = det.map((d: any) => d.item_id);
            const { data: items } = await supabase.from("items").select("*").in("id", ids);
            const itemMap = new Map((items ?? []).map((i: any) => [i.id, i]));
            setCart(
              det.map((d: any) => {
                const it = itemMap.get(d.item_id);
                return {
                  item_id: d.item_id,
                  kode: it?.kode ?? "",
                  nama: d.item_name,
                  qty: d.qty,
                  harga: d.harga_satuan,
                  diskon: d.harga_satuan * d.qty > 0 ? (d.diskon / (d.harga_satuan * d.qty)) * 100 : 0,
                  hpp: d.hpp_tercatat,
                  stok: it?.stok ?? 0,
                };
              })
            );
          }
        }
      } else {
        const no = await generateNoNota(supabase, "SI");
        setNoNota(no);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!custSearch.trim()) { setCustResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("sales_customers")
        .select("*")
        .ilike("nama", `%${custSearch.trim()}%`)
        .limit(8);
      if (data) setCustResults(data as Customer[]);
    }, 300);
    return () => clearTimeout(t);
  }, [custSearch, supabase]);

  useEffect(() => {
    if (!itemSearch.trim()) { setItemResults([]); return; }
    const t = setTimeout(async () => {
      const like = `%${itemSearch.trim()}%`;
      const { data } = await supabase
        .from("items")
        .select("*")
        .or(`kode.ilike.${like},nama.ilike.${like}`)
        .limit(8);
      if (data) setItemResults(data as Item[]);
    }, 300);
    return () => clearTimeout(t);
  }, [itemSearch, supabase]);

  function addToCart(item: Item) {
    setCart((prev) => {
      const ex = prev.find((l) => l.item_id === item.id);
      if (ex) {
        return prev.map((l) => (l.item_id === item.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [
        ...prev,
        {
          item_id: item.id,
          kode: item.kode,
          nama: item.nama,
          qty: 1,
          harga: item.harga_jual,
          diskon: 0,
          hpp: hppMethod === "last" ? item.harga_beli : item.avg_harga_beli,
          stok: item.stok,
        },
      ];
    });
    setItemSearch("");
    setItemResults([]);
  }

  function updateLine(item_id: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.item_id === item_id ? { ...l, ...patch } : l)));
  }

  function removeLine(item_id: string) {
    setCart((prev) => prev.filter((l) => l.item_id !== item_id));
  }

  const subtotal = cart.reduce((s, l) => s + l.harga * l.qty, 0);
  const itemDiskon = cart.reduce((s, l) => s + l.harga * l.qty * (l.diskon / 100), 0);
  const headerDiskonRp = subtotal * ((Number(headerDiskon) || 0) / 100);
  const totalDiskon = itemDiskon + headerDiskonRp;
  const total = subtotal - totalDiskon;

  async function saveCustomer() {
    setSavingCust(true);
    if (!newCust.nama.trim()) {
      toast.error("Nama pelanggan wajib diisi.");
      setSavingCust(false);
      return;
    }
    const { data, error } = await supabase
      .from("sales_customers")
      .insert({
        nama: newCust.nama.trim(),
        no_hp: newCust.no_hp.trim(),
        alamat: newCust.alamat.trim(),
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      setSavingCust(false);
      return;
    }
    setCustomer(data as Customer);
    setNewCust({ nama: "", no_hp: "", alamat: "" });
    setCustMode("search");
    setCustSearch("");
    setCustResults([]);
    toast.success("Pelanggan baru ditambahkan.");
    setSavingCust(false);
  }

  async function handleSave() {
    if (cart.length === 0) {
      toast.error("Belum ada barang di nota.");
      return;
    }
    if (status === "top" && !jatuhTempo) {
      toast.error("Isi tanggal jatuh tempo untuk nota TOP.");
      return;
    }

    for (const l of cart) {
      if (l.qty > l.stok) {
        toast.error(`Stok "${l.nama}" tidak cukup. Tersisa ${l.stok}, diminta ${l.qty}.`);
        return;
      }
    }

    setSaving(true);
    try {
      let invId: string;
      let no: string;

      if (editingId) {
        await prepareSalesForResave(supabase, editingId);
        const { data: inv, error: errUpd } = await supabase
          .from("sales_invoices")
          .update({
            customer_id: customer?.id ?? null,
            customer_name: customer?.nama ?? "Umum",
            status,
            jatuh_tempo: status === "top" ? jatuhTempo : null,
            subtotal,
            diskon: headerDiskonRp,
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
          .from("sales_invoices")
          .insert({
            no_nota: noNota,
            tanggal: todayISO(),
            customer_id: customer?.id ?? null,
            customer_name: customer?.nama ?? "Umum",
            status,
            jatuh_tempo: status === "top" ? jatuhTempo : null,
            subtotal,
            diskon: headerDiskonRp,
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
        const { error: errD } = await supabase.from("invoice_details").insert({
          invoice_type: "penjualan",
          invoice_id: invId,
          item_type: "barang",
          item_id: l.item_id,
          item_name: l.nama,
          qty: l.qty,
          harga_satuan: l.harga,
          hpp_tercatat: l.hpp,
          diskon: l.harga * l.qty * (l.diskon / 100),
          subtotal: l.harga * l.qty * (1 - l.diskon / 100),
        });
        if (errD) throw errD;

        const { data: cur } = await supabase.from("items").select("stok").eq("id", l.item_id).single();
        const newStok = (cur?.stok ?? 0) - l.qty;
        const { error: errS } = await supabase.from("items").update({ stok: newStok }).eq("id", l.item_id);
        if (errS) throw errS;

        await supabase.from("stock_mutations").insert({
          item_id: l.item_id,
          tanggal: todayISO(),
          jenis: "keluar",
          qty: l.qty,
          stok_sebelum: cur?.stok ?? 0,
          stok_sesudah: newStok,
          ref_type: "sales_invoices",
          ref_id: invId,
          note: no,
        });
      }

      if (status === "top") {
        await supabase.from("receivables").insert({
          sales_invoice_id: invId,
          total,
          paid: 0,
          status: "belum_lunas",
          jatuh_tempo: jatuhTempo,
        });
      } else {
        await supabase.from("ledgers").insert({
          tanggal: todayISO(),
          tipe: "masuk",
          kategori: "penjualan",
          jumlah: total,
          ref_type: "sales_invoices",
          ref_id: invId,
          keterangan: no,
        });
      }

      toast.success(`Nota ${no} berhasil ${editingId ? "diperbarui" : "dibuat"}.`);
      router.push(`/penjualan/${invId}`);
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`);
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {editingId ? "Edit Nota Penjualan" : "Nota Penjualan"}
          </h1>
          <p className="text-sm text-slate-500">No nota: <span className="font-mono font-semibold text-blue-600">{noNota}</span></p>
        </div>
        <button onClick={() => router.push("/penjualan")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          ← Kembali
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">Pelanggan</h2>
              {customer ? (
                <button onClick={() => setCustomer(null)} className="text-xs text-red-600 hover:underline">
                  Ganti ({customer.nama})
                </button>
              ) : (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  Default: Umum
                </span>
              )}
            </div>

            {!customer && custMode === "search" && (
              <div className="mt-3">
                <input
                  value={custSearch}
                  onChange={(e) => setCustSearch(e.target.value)}
                  placeholder="Cari nama pelanggan..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                {custResults.length > 0 && (
                  <ul className="mt-2 rounded-lg border border-slate-200">
                    {custResults.map((c) => (
                      <li key={c.id}>
                        <button
                          onClick={() => { setCustomer(c); setCustSearch(""); setCustResults([]); }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        >
                          <span className="font-medium">{c.nama}</span>
                          <span className="ml-2 text-xs text-slate-400">{c.no_hp}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button onClick={() => setCustMode("new")} className="mt-2 text-xs font-semibold text-blue-600 hover:underline">
                  + Pelanggan tidak ada di database? Daftarkan
                </button>
              </div>
            )}

            {!customer && custMode === "new" && (
              <div className="mt-3 space-y-2">
                <input value={newCust.nama} onChange={(e) => setNewCust({ ...newCust, nama: e.target.value })}
                  placeholder="Nama pelanggan *" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                <input value={newCust.no_hp} onChange={(e) => setNewCust({ ...newCust, no_hp: e.target.value })}
                  placeholder="No HP" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                <input value={newCust.alamat} onChange={(e) => setNewCust({ ...newCust, alamat: e.target.value })}
                  placeholder="Alamat" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={saveCustomer} disabled={savingCust} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {savingCust ? "Menyimpan..." : "Simpan & Pilih"}
                  </button>
                  <button onClick={() => setCustMode("search")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
                    Batal
                  </button>
                </div>
              </div>
            )}

            {customer && (
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">{customer.nama}</span>
                <span className="ml-2 text-xs text-slate-400">{customer.no_hp} · {customer.alamat}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-700">Pilih Barang</h2>
            <input
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Ketik kode / nama barang..."
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {itemResults.length > 0 && (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                {itemResults.map((it) => (
                  <li key={it.id}>
                    <button
                      onClick={() => addToCart(it)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span>
                        <span className="font-mono text-xs text-slate-400">{it.kode}</span>{" "}
                        <span className="font-medium">{it.nama}</span>
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatRupiah(it.harga_jual)} · stok {it.stok}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-700">Daftar Item ({cart.length})</h2>
            {cart.length === 0 ? (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
                Belum ada item. Klik barang di pencarian untuk menambahkan.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-2 py-1.5">Barang</th>
                      <th className="px-2 py-1.5 w-16">Qty</th>
                      <th className="px-2 py-1.5 w-28">Harga</th>
                      <th className="px-2 py-1.5 w-24">Diskon %</th>
                      <th className="px-2 py-1.5 text-right">Subtotal</th>
                      <th className="px-2 py-1.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((l) => (
                      <tr key={l.item_id} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-1.5">
                          <div className="font-medium">{l.nama}</div>
                          <div className="font-mono text-[10px] text-slate-400">{l.kode}</div>
                          {l.qty > l.stok && (
                            <div className="text-[10px] font-semibold text-red-600">⚠ stok hanya {l.stok}</div>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min={1} value={l.qty}
                            onChange={(e) => updateLine(l.item_id, { qty: Math.max(1, Number(e.target.value) || 1) })}
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right focus:border-blue-500 focus:outline-none" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={l.harga}
                            onChange={(e) => updateLine(l.item_id, { harga: Number(e.target.value) || 0 })}
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right focus:border-blue-500 focus:outline-none" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={l.diskon}
                            onChange={(e) => updateLine(l.item_id, { diskon: Number(e.target.value) || 0 })}
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right focus:border-blue-500 focus:outline-none" />
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold">
                          {formatRupiah(l.harga * l.qty * (1 - l.diskon / 100))}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button onClick={() => removeLine(l.item_id)} className="text-red-600 hover:underline">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-700">Pembayaran</h2>
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setStatus("lunas")}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${status === "lunas" ? "border-green-500 bg-green-50 text-green-700" : "border-slate-300 text-slate-600"}`}>
                  Lunas
                </button>
                <button onClick={() => setStatus("top")}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${status === "top" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-300 text-slate-600"}`}>
                  TOP (Tempo)
                </button>
              </div>
              {status === "top" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Jatuh Tempo</label>
                  <DateInput value={jatuhTempo} onChange={setJatuhTempo} />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Diskon Nota (%)</label>
                <input type="number" value={headerDiskon} onChange={(e) => setHeaderDiskon(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Catatan</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatRupiah(subtotal)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Diskon</span><span>- {formatRupiah(totalDiskon)}</span></div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-800">TOTAL</span>
                <span className="text-xl font-bold text-blue-700">{formatRupiah(total)}</span>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving || cart.length === 0}
              className="mt-4 w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Menyimpan..." : `Simpan Nota (${formatRupiah(total)})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
