"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, todayISO } from "@/lib/format";
import { useToast } from "@/components/toast";
import { generateNoNota } from "@/lib/nota";
import { prepareServiceForResave } from "@/lib/invoice-utils";

type ServiceCustomer = { id: string; nama: string; no_hp: string; alamat: string; jenis_motor: string; plat_nomor: string };
type Jasa = { id: string; nama: string; harga: number; komisi_tipe: "persen" | "nominal"; komisi_nilai: number };
type Item = { id: string; kode: string; nama: string; harga_jual: number; harga_beli: number; avg_harga_beli: number; stok: number };
type CartLine = {
  key: string;
  type: "jasa" | "barang";
  ref_id: string;
  nama: string;
  qty: number;
  harga: number;
  diskon: number;
  hpp: number;
  komisi: number;
  stok: number;
};

export default function ServisBaruPage() {
  const supabase = createClient();
  const router = useRouter();
  const toast = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadedNo, setLoadedNo] = useState("");
  const [noNota, setNoNota] = useState("");
  const [hppMethod, setHppMethod] = useState<"average" | "last">("average");

  const [customer, setCustomer] = useState<ServiceCustomer | null>(null);
  const [custSearch, setCustSearch] = useState("");
  const [custResults, setCustResults] = useState<ServiceCustomer[]>([]);
  const [custMode, setCustMode] = useState<"search" | "new">("search");
  const [newCust, setNewCust] = useState({ nama: "", no_hp: "", alamat: "", jenis_motor: "", plat_nomor: "" });
  const [savingCust, setSavingCust] = useState(false);

  const [mechanics, setMechanics] = useState<{ id: string; nama: string }[]>([]);
  const [mechanicId, setMechanicId] = useState("");

  const [pickerTab, setPickerTab] = useState<"jasa" | "barang">("jasa");
  const [itemSearch, setItemSearch] = useState("");
  const [jasaResults, setJasaResults] = useState<Jasa[]>([]);
  const [barangResults, setBarangResults] = useState<Item[]>([]);

  const [cart, setCart] = useState<CartLine[]>([]);
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

      const { data: mek } = await supabase.from("mechanics").select("id, nama").order("nama");
      if (mek) setMechanics(mek);

      if (editId) {
        const { data: inv } = await supabase.from("service_invoices").select("*").eq("id", editId).single();
        if (inv) {
          setLoadedNo(inv.no_nota);
          setNoNota(inv.no_nota);
          setHeaderDiskon(String(inv.subtotal > 0 ? ((inv.diskon || 0) / inv.subtotal) * 100 : 0));
          setNote(inv.note || "");
          if (inv.mechanic_id) setMechanicId(inv.mechanic_id);
          if (inv.customer_id) {
            const { data: c } = await supabase.from("service_customers").select("*").eq("id", inv.customer_id).single();
            if (c) setCustomer(c as ServiceCustomer);
          }
          const { data: det } = await supabase
            .from("invoice_details")
            .select("*")
            .eq("invoice_type", "servis")
            .eq("invoice_id", inv.id);
          if (det && det.length > 0) {
            const barangIds = det.filter((d: any) => d.item_type === "barang").map((d: any) => d.item_id);
            const itemMap = new Map<string, Item>();
            if (barangIds.length > 0) {
              const { data: items } = await supabase.from("items").select("*").in("id", barangIds);
              for (const it of items ?? []) itemMap.set(it.id, it as Item);
            }
            setCart(
              det.map((d: any) => ({
                key: `${d.item_type}-${d.item_id}`,
                type: d.item_type,
                ref_id: d.item_id,
                nama: d.item_name,
                qty: d.qty,
                harga: d.harga_satuan,
                diskon: d.harga_satuan * d.qty > 0 ? (d.diskon / (d.harga_satuan * d.qty)) * 100 : 0,
                hpp: d.hpp_tercatat,
                komisi: d.komisi,
                stok: itemMap.get(d.item_id)?.stok ?? 0,
              }))
            );
          }
        }
      } else {
        const no = await generateNoNota(supabase, "SRV");
        setNoNota(no);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cari pelanggan servis
  useEffect(() => {
    if (!custSearch.trim()) { setCustResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("service_customers")
        .select("*")
        .ilike("nama", `%${custSearch.trim()}%`)
        .limit(8);
      if (data) setCustResults(data as ServiceCustomer[]);
    }, 300);
    return () => clearTimeout(t);
  }, [custSearch, supabase]);

  // Cari jasa / barang sesuai tab
  useEffect(() => {
    if (!itemSearch.trim()) { setJasaResults([]); setBarangResults([]); return; }
    const t = setTimeout(async () => {
      const like = `%${itemSearch.trim()}%`;
      if (pickerTab === "jasa") {
        const { data } = await supabase.from("services").select("*").ilike("nama", like).limit(8);
        if (data) setJasaResults(data as Jasa[]);
      } else {
        const { data } = await supabase.from("items").select("*").or(`kode.ilike.${like},nama.ilike.${like}`).limit(8);
        if (data) setBarangResults(data as Item[]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [itemSearch, pickerTab, supabase]);

  function komisiJasa(j: Jasa): number {
    if (j.komisi_tipe === "persen") return Math.round((j.harga * j.komisi_nilai) / 100);
    return j.komisi_nilai;
  }

  function addJasa(j: Jasa) {
    const key = `jasa-${j.id}`;
    setCart((prev) => {
      const ex = prev.find((l) => l.key === key);
      if (ex) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, {
        key, type: "jasa" as const, ref_id: j.id, nama: j.nama, qty: 1,
        harga: j.harga, diskon: 0, hpp: 0, komisi: komisiJasa(j), stok: 0,
      }];
    });
    setItemSearch("");
    setJasaResults([]);
  }

  function addBarang(it: Item) {
    const key = `barang-${it.id}`;
    setCart((prev) => {
      const ex = prev.find((l) => l.key === key);
      if (ex) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, {
        key, type: "barang" as const, ref_id: it.id, nama: it.nama, qty: 1,
        harga: it.harga_jual, diskon: 0,
        hpp: hppMethod === "last" ? it.harga_beli : it.avg_harga_beli,
        komisi: 0, stok: it.stok,
      }];
    });
    setItemSearch("");
    setBarangResults([]);
  }

  function updateLine(key: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  const subtotal = cart.reduce((s, l) => s + l.harga * l.qty, 0);
  const itemDiskon = cart.reduce((s, l) => s + l.harga * l.qty * (l.diskon / 100), 0);
  const headerDiskonRp = subtotal * ((Number(headerDiskon) || 0) / 100);
  const totalDiskon = itemDiskon + headerDiskonRp;
  const total = subtotal - totalDiskon;
  const komisiTotal = cart.reduce((s, l) => s + l.komisi * l.qty, 0);

  async function saveCustomer() {
    setSavingCust(true);
    if (!newCust.nama.trim()) {
      toast.error("Nama pelanggan wajib diisi.");
      setSavingCust(false);
      return;
    }
    const { data, error } = await supabase
      .from("service_customers")
      .insert({
        nama: newCust.nama.trim(),
        no_hp: newCust.no_hp.trim(),
        alamat: newCust.alamat.trim(),
        jenis_motor: newCust.jenis_motor.trim(),
        plat_nomor: newCust.plat_nomor.trim(),
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      setSavingCust(false);
      return;
    }
    setCustomer(data as ServiceCustomer);
    setNewCust({ nama: "", no_hp: "", alamat: "", jenis_motor: "", plat_nomor: "" });
    setCustMode("search");
    setCustSearch("");
    setCustResults([]);
    toast.success("Pelanggan servis baru ditambahkan.");
    setSavingCust(false);
  }

  async function handleSave() {
    if (cart.length === 0) {
      toast.error("Belum ada jasa/sparepart di nota.");
      return;
    }
    if (!mechanicId) {
      toast.error("Pilih mekanik terlebih dahulu.");
      return;
    }
    // Validasi stok sparepart
    for (const l of cart) {
      if (l.type === "barang" && l.qty > l.stok) {
        toast.error(`Stok "${l.nama}" tidak cukup. Tersisa ${l.stok}.`);
        return;
      }
    }

    setSaving(true);
    try {
      let invId: string;
      let no: string;
      const mek = mechanics.find((m) => m.id === mechanicId);

      if (editingId) {
        await prepareServiceForResave(supabase, editingId);
        const { data: inv, error: errUpd } = await supabase
          .from("service_invoices")
          .update({
            customer_id: customer?.id ?? null,
            customer_name: customer?.nama ?? "Umum",
            mechanic_id: mechanicId,
            mechanic_name: mek?.nama ?? "",
            subtotal,
            diskon: headerDiskonRp,
            total,
            komisi_total: komisiTotal,
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
          .from("service_invoices")
          .insert({
            no_nota: noNota,
            tanggal: todayISO(),
            customer_id: customer?.id ?? null,
            customer_name: customer?.nama ?? "Umum",
            mechanic_id: mechanicId,
            mechanic_name: mek?.nama ?? "",
            status: "pengerjaan",
            subtotal,
            diskon: headerDiskonRp,
            total,
            komisi_total: komisiTotal,
            note,
            created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
          })
          .select()
          .single();
        if (errInv) throw errInv;
        invId = inv.id;
        no = noNota;
      }

      // Detail + stok sparepart
      for (const l of cart) {
        await supabase.from("invoice_details").insert({
          invoice_type: "servis",
          invoice_id: invId,
          item_type: l.type,
          item_id: l.ref_id,
          item_name: l.nama,
          qty: l.qty,
          harga_satuan: l.harga,
          hpp_tercatat: l.hpp,
          diskon: l.harga * l.qty * (l.diskon / 100),
          subtotal: l.harga * l.qty * (1 - l.diskon / 100),
          komisi: l.komisi,
        });

        if (l.type === "barang") {
          const { data: cur } = await supabase.from("items").select("stok").eq("id", l.ref_id).single();
          const newStok = (cur?.stok ?? 0) - l.qty;
          await supabase.from("items").update({ stok: newStok }).eq("id", l.ref_id);
          await supabase.from("stock_mutations").insert({
            item_id: l.ref_id,
            tanggal: todayISO(),
            jenis: "keluar",
            qty: l.qty,
            stok_sebelum: cur?.stok ?? 0,
            stok_sesudah: newStok,
            ref_type: "service_invoices",
            ref_id: invId,
            note: no,
          });
        }
      }

      // Komisi mekanik (belum dibayar — dibayar lewat menu Pembayaran Komisi)
      await supabase.from("mechanic_commissions").insert({
        service_invoice_id: invId,
        mechanic_id: mechanicId,
        jumlah: komisiTotal,
        status: "belum_dibayar",
      });

      toast.success(`Nota servis ${no} berhasil ${editingId ? "diperbarui" : "dibuat"}.`);
      router.push(`/servis/${invId}`);
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
            {editingId ? "Edit Nota Servis" : "Nota Servis"}
          </h1>
          <p className="text-sm text-slate-500">No nota: <span className="font-mono font-semibold text-blue-600">{noNota}</span></p>
        </div>
        <button onClick={() => router.push("/servis")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          ← Kembali
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* KOLOM KIRI */}
        <div className="space-y-4 lg:col-span-2">
          {/* Pelanggan */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">Pelanggan Servis</h2>
              {customer ? (
                <button onClick={() => setCustomer(null)} className="text-xs text-red-600 hover:underline">
                  Ganti ({customer.nama})
                </button>
              ) : (
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Default: Umum</span>
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
                          <span className="ml-2 text-xs text-slate-400">{c.plat_nomor} · {c.jenis_motor}</span>
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
              <div className="mt-3 grid grid-cols-2 gap-2">
                <input value={newCust.nama} onChange={(e) => setNewCust({ ...newCust, nama: e.target.value })} placeholder="Nama *"
                  className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                <input value={newCust.no_hp} onChange={(e) => setNewCust({ ...newCust, no_hp: e.target.value })} placeholder="No HP"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                <input value={newCust.jenis_motor} onChange={(e) => setNewCust({ ...newCust, jenis_motor: e.target.value })} placeholder="Jenis motor"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                <input value={newCust.plat_nomor} onChange={(e) => setNewCust({ ...newCust, plat_nomor: e.target.value })} placeholder="Plat nomor"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                <input value={newCust.alamat} onChange={(e) => setNewCust({ ...newCust, alamat: e.target.value })} placeholder="Alamat"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                <div className="col-span-2 flex gap-2">
                  <button onClick={saveCustomer} disabled={savingCust} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {savingCust ? "Menyimpan..." : "Simpan & Pilih"}
                  </button>
                  <button onClick={() => setCustMode("search")} className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">Batal</button>
                </div>
              </div>
            )}

            {customer && (
              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold">{customer.nama}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {customer.no_hp} · {customer.jenis_motor} · {customer.plat_nomor}
                </span>
              </div>
            )}
          </div>

          {/* Mekanik */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-700">Mekanik *</h2>
            <select
              value={mechanicId}
              onChange={(e) => setMechanicId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">-- Pilih Mekanik --</option>
              {mechanics.map((m) => (
                <option key={m.id} value={m.id}>{m.nama}</option>
              ))}
            </select>
          </div>

          {/* Pilih Jasa / Sparepart */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex gap-2">
              <button
                onClick={() => { setPickerTab("jasa"); setItemSearch(""); }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
                  pickerTab === "jasa" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-600"
                }`}
              >
                Jasa
              </button>
              <button
                onClick={() => { setPickerTab("barang"); setItemSearch(""); }}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
                  pickerTab === "barang" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-600"
                }`}
              >
                Sparepart
              </button>
            </div>
            <input
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder={pickerTab === "jasa" ? "Cari nama jasa..." : "Cari kode / nama sparepart..."}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {pickerTab === "jasa" && jasaResults.length > 0 && (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                {jasaResults.map((j) => (
                  <li key={j.id}>
                    <button onClick={() => addJasa(j)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <span className="font-medium">{j.nama}</span>
                      <span className="text-xs text-slate-500">
                        {formatRupiah(j.harga)} · komisi{" "}
                        {j.komisi_tipe === "persen" ? `${j.komisi_nilai}%` : formatRupiah(j.komisi_nilai)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {pickerTab === "barang" && barangResults.length > 0 && (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                {barangResults.map((it) => (
                  <li key={it.id}>
                    <button onClick={() => addBarang(it)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <span>
                        <span className="font-mono text-xs text-slate-400">{it.kode}</span>{" "}
                        <span className="font-medium">{it.nama}</span>
                      </span>
                      <span className="text-xs text-slate-500">{formatRupiah(it.harga_jual)} · stok {it.stok}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Keranjang */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-700">Daftar Item ({cart.length})</h2>
            {cart.length === 0 ? (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
                Belum ada item. Pilih jasa / sparepart di atas.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-2 py-1.5">Item</th>
                      <th className="px-2 py-1.5 w-16">Qty</th>
                      <th className="px-2 py-1.5 w-24">Harga</th>
                      <th className="px-2 py-1.5 w-20">Diskon %</th>
                      <th className="px-2 py-1.5 text-right">Subtotal</th>
                      <th className="px-2 py-1.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((l) => (
                      <tr key={l.key} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-1.5">
                          <div className="font-medium">{l.nama}</div>
                          <div className="text-[10px] text-slate-400">
                            {l.type === "jasa" ? `Jasa · komisi ${formatRupiah(l.komisi)}` : `Sparepart${l.qty > l.stok ? ` · ⚠ stok ${l.stok}` : ""}`}
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min={1} value={l.qty}
                            onChange={(e) => updateLine(l.key, { qty: Math.max(1, Number(e.target.value) || 1) })}
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right focus:border-blue-500 focus:outline-none" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={l.harga}
                            onChange={(e) => updateLine(l.key, { harga: Number(e.target.value) || 0 })}
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right focus:border-blue-500 focus:outline-none" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={l.diskon}
                            onChange={(e) => updateLine(l.key, { diskon: Number(e.target.value) || 0 })}
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right focus:border-blue-500 focus:outline-none" />
                        </td>
                        <td className="px-2 py-1.5 text-right font-semibold">
                          {formatRupiah(l.harga * l.qty * (1 - l.diskon / 100))}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button onClick={() => removeLine(l.key)} className="text-red-600 hover:underline">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* KOLOM KANAN */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-700">Ringkasan</h2>
            <div className="mt-3 space-y-3">
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
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatRupiah(subtotal)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Diskon</span><span>- {formatRupiah(totalDiskon)}</span></div>
              <div className="flex justify-between text-blue-700"><span>Komisi Mekanik</span><span>{formatRupiah(komisiTotal)}</span></div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-800">TOTAL</span>
                <span className="text-xl font-bold text-blue-700">{formatRupiah(total)}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Status awal: <b>Pengerjaan</b>. Tandai Selesai di daftar servis setelah pekerjaan selesai.
            </p>
            <button
              onClick={handleSave}
              disabled={saving || cart.length === 0}
              className="mt-4 w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : `Simpan Nota (${formatRupiah(total)})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
