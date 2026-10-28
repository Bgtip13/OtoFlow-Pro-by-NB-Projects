"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, todayISO } from "@/lib/format";
import { useToast } from "@/components/toast";
import { generateNoNota } from "@/lib/nota";
import { prepareSalesForResave } from "@/lib/invoice-utils";
import DateInput from "@/components/date-input";
import { Badge, Button, Card, CardTitle, Input } from "@/components/ui";
import {
  ArrowLeft, CreditCard, Package, Plus, Receipt, Search, Trash2, User, UserPlus, X,
} from "lucide-react";

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
  const [ready, setReady] = useState(false);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [custSearch, setCustSearch] = useState("");
  const [custResults, setCustResults] = useState<Customer[]>([]);
  const [custMode, setCustMode] = useState<"search" | "new">("search");
  const [newCust, setNewCust] = useState({ nama: "", no_hp: "", alamat: "" });
  const [savingCust, setSavingCust] = useState(false);

  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState<Item[]>([]);
  const [searchingItem, setSearchingItem] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);

  const [status, setStatus] = useState<"lunas" | "top">("lunas");
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [headerDiskon, setHeaderDiskon] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const itemReq = useRef(0);
  const custReq = useRef(0);

  useEffect(() => {
    (async () => {
      const q = new URLSearchParams(window.location.search);
      const editId = q.get("id");
      if (editId) setEditingId(editId);

      const { data: s } = await supabase.from("settings").select("hpp_method").eq("id", 1).maybeSingle();
      if (s) setHppMethod(s.hpp_method);
      setJatuhTempo(todayISO());

      if (editId) {
        const { data: inv } = await supabase.from("sales_invoices").select("*").eq("id", editId).maybeSingle();
        if (inv) {
          setLoadedNo(inv.no_nota);
          setNoNota(inv.no_nota);
          setStatus(inv.status);
          setJatuhTempo(inv.jatuh_tempo || todayISO());
          setHeaderDiskon(String(inv.subtotal > 0 ? ((inv.diskon || 0) / inv.subtotal) * 100 : 0));
          setNote(inv.note || "");
          if (inv.customer_id) {
            const { data: c } = await supabase
              .from("sales_customers")
              .select("*")
              .eq("id", inv.customer_id)
              .maybeSingle();
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
                const gross = d.harga_satuan * d.qty;
                return {
                  item_id: d.item_id,
                  kode: it?.kode ?? "",
                  nama: d.item_name,
                  qty: d.qty,
                  harga: d.harga_satuan,
                  diskon: gross > 0 ? (d.diskon / gross) * 100 : 0,
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
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cari pelanggan (debounce + penjaga urutan)
  useEffect(() => {
    if (!custSearch.trim()) {
      setCustResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const id = ++custReq.current;
      const { data } = await supabase
        .from("sales_customers")
        .select("*")
        .ilike("nama", `%${custSearch.trim()}%`)
        .limit(8);
      if (id !== custReq.current) return;
      if (data) setCustResults(data as Customer[]);
    }, 300);
    return () => clearTimeout(t);
  }, [custSearch, supabase]);

  // Cari barang (debounce + penjaga urutan)
  useEffect(() => {
    if (!itemSearch.trim()) {
      setItemResults([]);
      setSearchingItem(false);
      return;
    }
    setSearchingItem(true);
    const t = setTimeout(async () => {
      const id = ++itemReq.current;
      const like = `%${itemSearch.trim().replace(/[",()]/g, " ")}%`;
      const { data } = await supabase
        .from("items")
        .select("id, kode, nama, harga_jual, harga_beli, avg_harga_beli, stok")
        .or(`kode.ilike."${like}",nama.ilike."${like}"`)
        .limit(8);
      if (id !== itemReq.current) return;
      setItemResults((data ?? []) as Item[]);
      setSearchingItem(false);
    }, 300);
    return () => clearTimeout(t);
  }, [itemSearch, supabase]);

  function addToCart(item: Item) {
    setCart((prev) => {
      const ex = prev.find((l) => l.item_id === item.id);
      if (ex) return prev.map((l) => (l.item_id === item.id ? { ...l, qty: l.qty + 1 } : l));
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
  const headerDiskonPct = Math.min(100, Math.max(0, Number(headerDiskon) || 0));
  const headerDiskonRp = subtotal * (headerDiskonPct / 100);
  const totalDiskon = itemDiskon + headerDiskonRp;
  const total = subtotal - totalDiskon;
  const totalQty = cart.reduce((s, l) => s + l.qty, 0);

  async function saveCustomer() {
    if (!newCust.nama.trim()) {
      toast.error("Nama pelanggan wajib diisi.");
      return;
    }
    setSavingCust(true);
    const { data, error } = await supabase
      .from("sales_customers")
      .insert({ nama: newCust.nama.trim(), no_hp: newCust.no_hp.trim(), alamat: newCust.alamat.trim() })
      .select()
      .single();
    setSavingCust(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCustomer(data as Customer);
    setNewCust({ nama: "", no_hp: "", alamat: "" });
    setCustMode("search");
    setCustSearch("");
    setCustResults([]);
    toast.success("Pelanggan baru ditambahkan.");
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
        const { error: errUpd } = await supabase
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
          .eq("id", editingId);
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

      const mutations: Record<string, unknown>[] = [];

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
        const before = cur?.stok ?? 0;
        const newStok = before - l.qty;
        const { error: errS } = await supabase.from("items").update({ stok: newStok }).eq("id", l.item_id);
        if (errS) throw errS;

        mutations.push({
          item_id: l.item_id,
          tanggal: todayISO(),
          jenis: "keluar",
          qty: l.qty,
          stok_sebelum: before,
          stok_sesudah: newStok,
          ref_type: "sales_invoices",
          ref_id: invId,
          note: no,
        });
      }

      if (mutations.length > 0) await supabase.from("stock_mutations").insert(mutations);

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
            onClick={() => router.push("/penjualan")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900">
              {editingId ? "Edit Nota Penjualan" : "Nota Penjualan Baru"}
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
          {/* Pelanggan */}
          <Card>
            <CardTitle icon={User} right={
              customer ? (
                <button onClick={() => setCustomer(null)} className="text-xs font-semibold text-red-600 hover:underline">
                  Ganti ({customer.nama})
                </button>
              ) : (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  Default: Umum
                </span>
              )
            }>
              Pelanggan
            </CardTitle>

            {!customer && custMode === "search" && (
              <div className="mt-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={custSearch}
                    onChange={(e) => setCustSearch(e.target.value)}
                    placeholder="Cari nama pelanggan..."
                    className="pl-9"
                  />
                </div>
                {custResults.length > 0 && (
                  <ul className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {custResults.map((c) => (
                      <li key={c.id}>
                        <button
                          onClick={() => {
                            setCustomer(c);
                            setCustSearch("");
                            setCustResults([]);
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-700">{c.nama}</span>
                          <span className="text-xs text-slate-400">{c.no_hp}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => setCustMode("new")}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Pelanggan belum terdaftar? Daftarkan
                </button>
              </div>
            )}

            {!customer && custMode === "new" && (
              <div className="mt-3 space-y-2">
                <Input
                  value={newCust.nama}
                  onChange={(e) => setNewCust({ ...newCust, nama: e.target.value })}
                  placeholder="Nama pelanggan *"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={newCust.no_hp}
                    onChange={(e) => setNewCust({ ...newCust, no_hp: e.target.value })}
                    placeholder="No HP"
                  />
                  <Input
                    value={newCust.alamat}
                    onChange={(e) => setNewCust({ ...newCust, alamat: e.target.value })}
                    placeholder="Alamat"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="primary" size="sm" onClick={saveCustomer} loading={savingCust}>
                    {savingCust ? "Menyimpan..." : "Simpan & Pilih"}
                  </Button>
                  <Button size="sm" onClick={() => setCustMode("search")}>
                    Batal
                  </Button>
                </div>
              </div>
            )}

            {customer && (
              <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-inset ring-slate-100">
                <span className="font-semibold text-slate-800">{customer.nama}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {customer.no_hp}
                  {customer.alamat ? ` · ${customer.alamat}` : ""}
                </span>
              </div>
            )}
          </Card>

          {/* Pilih barang */}
          <Card>
            <CardTitle icon={Package} hint="Klik hasil pencarian untuk menambah ke nota">
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

            {searchingItem && itemSearch.trim() && (
              <p className="mt-2 text-xs text-slate-400">Mencari barang…</p>
            )}

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
                        {formatRupiah(it.harga_jual)} · stok {it.stok}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {itemSearch.trim() && !searchingItem && itemResults.length === 0 && (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">
                Barang tidak ditemukan.
              </p>
            )}
          </Card>

          {/* Keranjang */}
          <Card>
            <CardTitle icon={Receipt} right={<Badge tone="blue">{cart.length} item</Badge>}>
              Daftar Item
            </CardTitle>

            {cart.length === 0 ? (
              <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
                <Plus className="h-6 w-6 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">Belum ada item</p>
                <p className="text-xs text-slate-400">Cari barang di atas lalu klik untuk menambahkan.</p>
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
                      <th className="px-2 py-2 font-bold">Barang</th>
                      <th className="w-16 px-2 py-2 font-bold">Qty</th>
                      <th className="w-28 px-2 py-2 font-bold">Harga</th>
                      <th className="w-20 px-2 py-2 font-bold">Disc %</th>
                      <th className="px-2 py-2 text-right font-bold">Subtotal</th>
                      <th className="w-8 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((l) => (
                      <tr key={l.item_id} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-2">
                          <div className="font-semibold text-slate-700">{l.nama}</div>
                          <div className="font-mono text-[10px] text-slate-400">{l.kode}</div>
                          {l.qty > l.stok && (
                            <div className="text-[10px] font-semibold text-red-600">⚠ stok hanya {l.stok}</div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min={1}
                            value={l.qty}
                            onChange={(e) => updateLine(l.item_id, { qty: Math.max(1, Number(e.target.value) || 1) })}
                            className="h-8 px-1.5 text-right text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            value={l.harga}
                            onChange={(e) => updateLine(l.item_id, { harga: Number(e.target.value) || 0 })}
                            className="h-8 px-1.5 text-right text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={l.diskon}
                            onChange={(e) =>
                              updateLine(l.item_id, { diskon: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
                            }
                            className="h-8 px-1.5 text-right text-xs"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-slate-800">
                          {formatRupiah(l.harga * l.qty * (1 - l.diskon / 100))}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            onClick={() => removeLine(l.item_id)}
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
              </div>
            )}
          </Card>
        </div>

        {/* Ringkasan */}
        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardTitle icon={CreditCard}>Pembayaran</CardTitle>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStatus("lunas")}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    status === "lunas"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/15"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Lunas
                </button>
                <button
                  onClick={() => setStatus("top")}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    status === "top"
                      ? "border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-500/15"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  TOP (Tempo)
                </button>
              </div>

              {status === "top" && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Jatuh Tempo</label>
                  <DateInput value={jatuhTempo} onChange={setJatuhTempo} />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Diskon Nota (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={headerDiskon}
                  onChange={(e) => setHeaderDiskon(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Catatan</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-b from-white to-slate-50/60">
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal ({totalQty} item)</span>
                <span className="font-medium text-slate-700">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Diskon Item</span>
                <span className="font-medium text-slate-700">- {formatRupiah(itemDiskon)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Diskon Nota ({headerDiskonPct}%)</span>
                <span className="font-medium text-slate-700">- {formatRupiah(headerDiskonRp)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Total</span>
                <span className="text-xl font-bold tracking-tight text-blue-700">{formatRupiah(total)}</span>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              disabled={cart.length === 0}
              className="mt-4 h-11 w-full"
            >
              {saving ? "Menyimpan..." : `Simpan Nota · ${formatRupiah(total)}`}
            </Button>
            {totalDiskon > 0 && (
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Hemat {formatRupiah(totalDiskon)} dari harga normal
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
