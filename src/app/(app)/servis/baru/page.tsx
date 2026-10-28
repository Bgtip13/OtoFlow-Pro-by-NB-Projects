"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, todayISO } from "@/lib/format";
import { useToast } from "@/components/toast";
import { generateNoNota } from "@/lib/nota";
import { prepareServiceForResave, recordServiceIncome } from "@/lib/invoice-utils";
import { Badge, Button, Card, CardTitle, Input, Select } from "@/components/ui";
import {
  ArrowLeft, Bike, HandCoins, Package, Plus, Receipt, Search, Trash2, User, UserPlus, Wrench,
} from "lucide-react";

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
  const [invoiceStatus, setInvoiceStatus] = useState<"pengerjaan" | "selesai">("pengerjaan");
  const [hppMethod, setHppMethod] = useState<"average" | "last">("average");
  const [ready, setReady] = useState(false);

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
  const [searching, setSearching] = useState(false);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [headerDiskon, setHeaderDiskon] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const searchReq = useRef(0);
  const custReq = useRef(0);

  useEffect(() => {
    (async () => {
      const q = new URLSearchParams(window.location.search);
      const editId = q.get("id");
      if (editId) setEditingId(editId);

      const [{ data: s }, { data: mek }] = await Promise.all([
        supabase.from("settings").select("hpp_method").eq("id", 1).maybeSingle(),
        supabase.from("mechanics").select("id, nama").order("nama"),
      ]);
      if (s) setHppMethod(s.hpp_method);
      if (mek) setMechanics(mek);

      if (editId) {
        const { data: inv } = await supabase.from("service_invoices").select("*").eq("id", editId).maybeSingle();
        if (inv) {
          setLoadedNo(inv.no_nota);
          setNoNota(inv.no_nota);
          setInvoiceStatus(inv.status === "selesai" ? "selesai" : "pengerjaan");
          setHeaderDiskon(String(inv.subtotal > 0 ? ((inv.diskon || 0) / inv.subtotal) * 100 : 0));
          setNote(inv.note || "");
          if (inv.mechanic_id) setMechanicId(inv.mechanic_id);
          if (inv.customer_id) {
            const { data: c } = await supabase
              .from("service_customers")
              .select("*")
              .eq("id", inv.customer_id)
              .maybeSingle();
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
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cari pelanggan servis
  useEffect(() => {
    if (!custSearch.trim()) {
      setCustResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const id = ++custReq.current;
      const { data } = await supabase
        .from("service_customers")
        .select("*")
        .ilike("nama", `%${custSearch.trim()}%`)
        .limit(8);
      if (id !== custReq.current) return;
      if (data) setCustResults(data as ServiceCustomer[]);
    }, 300);
    return () => clearTimeout(t);
  }, [custSearch, supabase]);

  // Cari jasa / barang sesuai tab
  useEffect(() => {
    if (!itemSearch.trim()) {
      setJasaResults([]);
      setBarangResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const id = ++searchReq.current;
      const like = `%${itemSearch.trim().replace(/[",()]/g, " ")}%`;
      if (pickerTab === "jasa") {
        const { data } = await supabase.from("services").select("*").ilike("nama", like).limit(8);
        if (id !== searchReq.current) return;
        setJasaResults((data ?? []) as Jasa[]);
      } else {
        const { data } = await supabase
          .from("items")
          .select("id, kode, nama, harga_jual, harga_beli, avg_harga_beli, stok")
          .or(`kode.ilike."${like}",nama.ilike."${like}"`)
          .limit(8);
        if (id !== searchReq.current) return;
        setBarangResults((data ?? []) as Item[]);
      }
      setSearching(false);
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
      return [
        ...prev,
        {
          key, type: "jasa" as const, ref_id: j.id, nama: j.nama, qty: 1,
          harga: j.harga, diskon: 0, hpp: 0, komisi: komisiJasa(j), stok: 0,
        },
      ];
    });
    setItemSearch("");
    setJasaResults([]);
  }

  function addBarang(it: Item) {
    const key = `barang-${it.id}`;
    setCart((prev) => {
      const ex = prev.find((l) => l.key === key);
      if (ex) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      return [
        ...prev,
        {
          key, type: "barang" as const, ref_id: it.id, nama: it.nama, qty: 1,
          harga: it.harga_jual, diskon: 0,
          hpp: hppMethod === "last" ? it.harga_beli : it.avg_harga_beli,
          komisi: 0, stok: it.stok,
        },
      ];
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
    if (!newCust.nama.trim()) {
      toast.error("Nama pelanggan wajib diisi.");
      return;
    }
    setSavingCust(true);
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
    setSavingCust(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCustomer(data as ServiceCustomer);
    setNewCust({ nama: "", no_hp: "", alamat: "", jenis_motor: "", plat_nomor: "" });
    setCustMode("search");
    setCustSearch("");
    setCustResults([]);
    toast.success("Pelanggan servis baru ditambahkan.");
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
      let hasPaidCommission = false;
      const mek = mechanics.find((m) => m.id === mechanicId);

      if (editingId) {
        const prep = await prepareServiceForResave(supabase, editingId);
        hasPaidCommission = prep.hasPaidCommission;

        const { error: errUpd } = await supabase
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
          .eq("id", editingId);
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

      const mutations: Record<string, unknown>[] = [];

      for (const l of cart) {
        const { error: errD } = await supabase.from("invoice_details").insert({
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
        if (errD) throw errD;

        if (l.type === "barang") {
          const { data: cur } = await supabase.from("items").select("stok").eq("id", l.ref_id).single();
          const before = cur?.stok ?? 0;
          const newStok = before - l.qty;
          const { error: errS } = await supabase.from("items").update({ stok: newStok }).eq("id", l.ref_id);
          if (errS) throw errS;
          mutations.push({
            item_id: l.ref_id,
            tanggal: todayISO(),
            jenis: "keluar",
            qty: l.qty,
            stok_sebelum: before,
            stok_sesudah: newStok,
            ref_type: "service_invoices",
            ref_id: invId,
            note: no,
          });
        }
      }

      if (mutations.length > 0) await supabase.from("stock_mutations").insert(mutations);

      // Komisi mekanik — jangan buat ulang jika komisi sudah pernah dibayar
      if (!hasPaidCommission) {
        const { error: errKom } = await supabase.from("mechanic_commissions").insert({
          service_invoice_id: invId,
          mechanic_id: mechanicId,
          jumlah: komisiTotal,
          status: "belum_dibayar",
        });
        if (errKom) throw errKom;
      }

      // Nota yang sudah selesai tetap harus punya catatan pemasukan di jurnal
      if (invoiceStatus === "selesai") {
        await recordServiceIncome(supabase, invId, total, no);
      }

      toast.success(`Nota servis ${no} berhasil ${editingId ? "diperbarui" : "dibuat"}.`);
      router.push(`/servis/${invId}`);
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
          <div className="skeleton h-72 rounded-2xl lg:col-span-2" />
          <div className="skeleton h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/servis")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900">
              {editingId ? "Edit Nota Servis" : "Nota Servis Baru"}
            </h1>
            <p className="text-[13px] text-slate-500">
              No nota: <span className="font-mono font-semibold text-blue-600">{noNota}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editingId && <Badge tone="amber">Mode Edit</Badge>}
          <Badge tone={invoiceStatus === "selesai" ? "green" : "blue"}>
            {invoiceStatus === "selesai" ? "Selesai" : "Pengerjaan"}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {/* Pelanggan */}
          <Card>
            <CardTitle
              icon={Bike}
              right={
                customer ? (
                  <button onClick={() => setCustomer(null)} className="text-xs font-semibold text-red-600 hover:underline">
                    Ganti ({customer.nama})
                  </button>
                ) : (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    Default: Umum
                  </span>
                )
              }
            >
              Pelanggan Servis
            </CardTitle>

            {!customer && custMode === "search" && (
              <div className="mt-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={custSearch}
                    onChange={(e) => setCustSearch(e.target.value)}
                    placeholder="Cari nama pelanggan / plat nomor..."
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
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-700">{c.nama}</span>
                          <span className="shrink-0 text-xs text-slate-400">
                            {c.plat_nomor} · {c.jenis_motor}
                          </span>
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
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Input
                  value={newCust.nama}
                  onChange={(e) => setNewCust({ ...newCust, nama: e.target.value })}
                  placeholder="Nama *"
                  className="col-span-2"
                />
                <Input value={newCust.no_hp} onChange={(e) => setNewCust({ ...newCust, no_hp: e.target.value })} placeholder="No HP" />
                <Input value={newCust.jenis_motor} onChange={(e) => setNewCust({ ...newCust, jenis_motor: e.target.value })} placeholder="Jenis motor" />
                <Input value={newCust.plat_nomor} onChange={(e) => setNewCust({ ...newCust, plat_nomor: e.target.value })} placeholder="Plat nomor" />
                <Input value={newCust.alamat} onChange={(e) => setNewCust({ ...newCust, alamat: e.target.value })} placeholder="Alamat" />
                <div className="col-span-2 flex gap-2 pt-1">
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
                  {customer.no_hp} · {customer.jenis_motor} · {customer.plat_nomor}
                </span>
              </div>
            )}
          </Card>

          {/* Mekanik */}
          <Card>
            <CardTitle icon={User}>Mekanik Penanggung Jawab</CardTitle>
            <Select
              value={mechanicId}
              onChange={(e) => setMechanicId(e.target.value)}
              className="mt-3 w-full"
            >
              <option value="">-- Pilih Mekanik --</option>
              {mechanics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama}
                </option>
              ))}
            </Select>
          </Card>

          {/* Pilih jasa / sparepart */}
          <Card>
            <CardTitle icon={Wrench} hint="Pilih tab lalu klik hasil pencarian">
              Pilih Jasa / Sparepart
            </CardTitle>
            <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => {
                  setPickerTab("jasa");
                  setItemSearch("");
                }}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  pickerTab === "jasa" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Jasa
              </button>
              <button
                onClick={() => {
                  setPickerTab("barang");
                  setItemSearch("");
                }}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  pickerTab === "barang" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Sparepart
              </button>
            </div>

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder={pickerTab === "jasa" ? "Cari nama jasa..." : "Cari kode / nama sparepart..."}
                className="pl-9"
              />
            </div>

            {searching && itemSearch.trim() && <p className="mt-2 text-xs text-slate-400">Mencari…</p>}

            {pickerTab === "jasa" && jasaResults.length > 0 && (
              <ul className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                {jasaResults.map((j) => (
                  <li key={j.id}>
                    <button
                      onClick={() => addJasa(j)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-blue-50/60"
                    >
                      <span className="font-medium text-slate-700">{j.nama}</span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {formatRupiah(j.harga)} · komisi{" "}
                        {j.komisi_tipe === "persen" ? `${j.komisi_nilai}%` : formatRupiah(j.komisi_nilai)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {pickerTab === "barang" && barangResults.length > 0 && (
              <ul className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                {barangResults.map((it) => (
                  <li key={it.id}>
                    <button
                      onClick={() => addBarang(it)}
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

            {itemSearch.trim() && !searching && jasaResults.length === 0 && barangResults.length === 0 && (
              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-center text-xs text-slate-400">
                Tidak ada hasil.
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
                <p className="text-xs text-slate-400">Pilih jasa atau sparepart di atas.</p>
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
                      <th className="px-2 py-2 font-bold">Item</th>
                      <th className="w-16 px-2 py-2 font-bold">Qty</th>
                      <th className="w-24 px-2 py-2 font-bold">Harga</th>
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
                          <div className="text-[10px] text-slate-400">
                            {l.type === "jasa"
                              ? `Jasa · komisi ${formatRupiah(l.komisi)}`
                              : `Sparepart${l.qty > l.stok ? ` · ⚠ stok ${l.stok}` : ""}`}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min={1}
                            value={l.qty}
                            onChange={(e) => updateLine(l.key, { qty: Math.max(1, Number(e.target.value) || 1) })}
                            className="h-8 px-1.5 text-right text-xs"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            value={l.harga}
                            onChange={(e) => updateLine(l.key, { harga: Number(e.target.value) || 0 })}
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
                              updateLine(l.key, { diskon: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
                            }
                            className="h-8 px-1.5 text-right text-xs"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-slate-800">
                          {formatRupiah(l.harga * l.qty * (1 - l.diskon / 100))}
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
              </div>
            )}
          </Card>
        </div>

        {/* Ringkasan */}
        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardTitle icon={HandCoins}>Ringkasan</CardTitle>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Diskon Nota (%)</label>
                <Input type="number" min={0} max={100} value={headerDiskon} onChange={(e) => setHeaderDiskon(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Catatan</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional" />
              </div>
            </div>

            <div className="mt-3 space-y-2 text-[13px]">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="font-medium text-slate-700">{formatRupiah(subtotal)}</span></div>
              <div className="flex justify-between text-slate-500"><span>Diskon</span><span className="font-medium text-slate-700">- {formatRupiah(totalDiskon)}</span></div>
              <div className="flex justify-between text-amber-600"><span>Komisi Mekanik</span><span className="font-medium">{formatRupiah(komisiTotal)}</span></div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Total</span>
                <span className="text-xl font-bold tracking-tight text-blue-700">{formatRupiah(total)}</span>
              </div>
            </div>

            <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] leading-relaxed text-slate-500">
              Status awal nota adalah <b>Pengerjaan</b>. Tandai selesai di daftar servis setelah pekerjaan
              rampung agar pemasukan masuk laporan.
            </p>

            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
              disabled={cart.length === 0}
              className="mt-3 h-11 w-full"
            >
              {saving ? "Menyimpan..." : `Simpan Nota · ${formatRupiah(total)}`}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
