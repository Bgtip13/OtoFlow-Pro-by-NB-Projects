import { todayISO } from "@/lib/format";

type DB = any;

type StockLine = { item_id: string; item_type: string; qty: number };

async function stockLines(supabase: DB, invoiceType: string, invoiceId: string): Promise<StockLine[]> {
  const { data } = await supabase
    .from("invoice_details")
    .select("item_id, item_type, qty")
    .eq("invoice_type", invoiceType)
    .eq("invoice_id", invoiceId);
  return (data ?? []) as StockLine[];
}

async function currentStock(supabase: DB, ids: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from("items").select("id, stok").in("id", ids);
  for (const row of data ?? []) map.set(row.id, row.stok ?? 0);
  return map;
}

function aggregateQty(lines: StockLine[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) {
    if (line.item_type !== "barang" || !line.item_id) continue;
    totals.set(line.item_id, (totals.get(line.item_id) ?? 0) + (line.qty ?? 0));
  }
  return totals;
}

/**
 * Kembalikan stok untuk semua detail barang sebuah nota.
 * Stok diambil sekali (bukan per baris) lalu mutasi disimpan dalam satu insert.
 */
export async function restoreStock(supabase: DB, invoiceType: string, invoiceId: string) {
  const totals = aggregateQty(await stockLines(supabase, invoiceType, invoiceId));
  if (totals.size === 0) return;

  const stock = await currentStock(supabase, [...totals.keys()]);
  const mutations: Record<string, unknown>[] = [];

  await Promise.all(
    [...totals.entries()].map(async ([itemId, qty]) => {
      const before = stock.get(itemId) ?? 0;
      const after = before + qty;
      const { error } = await supabase.from("items").update({ stok: after }).eq("id", itemId);
      if (error) throw error;
      mutations.push({
        item_id: itemId,
        tanggal: todayISO(),
        jenis: "masuk",
        qty,
        stok_sebelum: before,
        stok_sesudah: after,
        ref_type: "restore",
        ref_id: invoiceId,
        note: "Restok (edit/hapus nota)",
      });
    })
  );

  if (mutations.length > 0) await supabase.from("stock_mutations").insert(mutations);
}

/* ============================================================
   PENJUALAN
   ============================================================ */
export async function deleteSalesInvoice(supabase: DB, invoiceId: string) {
  await restoreStock(supabase, "penjualan", invoiceId);
  await Promise.all([
    supabase.from("invoice_details").delete().eq("invoice_type", "penjualan").eq("invoice_id", invoiceId),
    supabase.from("receivables").delete().eq("sales_invoice_id", invoiceId),
    supabase.from("ledgers").delete().eq("ref_type", "sales_invoices").eq("ref_id", invoiceId),
  ]);
  const { error } = await supabase.from("sales_invoices").delete().eq("id", invoiceId);
  if (error) throw error;
}

export async function prepareSalesForResave(supabase: DB, invoiceId: string) {
  await restoreStock(supabase, "penjualan", invoiceId);
  await Promise.all([
    supabase.from("invoice_details").delete().eq("invoice_type", "penjualan").eq("invoice_id", invoiceId),
    supabase.from("receivables").delete().eq("sales_invoice_id", invoiceId),
    supabase.from("ledgers").delete().eq("ref_type", "sales_invoices").eq("ref_id", invoiceId),
  ]);
}

/* ============================================================
   SERVIS
   ============================================================ */
export async function deleteServiceInvoice(supabase: DB, invoiceId: string) {
  await restoreStock(supabase, "servis", invoiceId);
  await Promise.all([
    supabase.from("invoice_details").delete().eq("invoice_type", "servis").eq("invoice_id", invoiceId),
    supabase.from("mechanic_commissions").delete().eq("service_invoice_id", invoiceId),
    supabase.from("ledgers").delete().eq("ref_type", "service_invoices").eq("ref_id", invoiceId),
  ]);
  const { error } = await supabase.from("service_invoices").delete().eq("id", invoiceId);
  if (error) throw error;
}

/**
 * Bersihkan nota servis sebelum disimpan ulang.
 * Komisi yang SUDAH dibayar tidak dihapus agar riwayat pembayaran mekanik tidak hilang.
 * Return `hasPaidCommission` dipakai untuk mencegah komisi ganda saat nota disimpan ulang.
 */
export async function prepareServiceForResave(
  supabase: DB,
  invoiceId: string
): Promise<{ hasPaidCommission: boolean }> {
  await restoreStock(supabase, "servis", invoiceId);

  const { count } = await supabase
    .from("mechanic_commissions")
    .select("id", { count: "exact", head: true })
    .eq("service_invoice_id", invoiceId)
    .eq("status", "lunas");

  await Promise.all([
    supabase.from("invoice_details").delete().eq("invoice_type", "servis").eq("invoice_id", invoiceId),
    supabase.from("ledgers").delete().eq("ref_type", "service_invoices").eq("ref_id", invoiceId),
    supabase
      .from("mechanic_commissions")
      .delete()
      .eq("service_invoice_id", invoiceId)
      .eq("status", "belum_dibayar"),
  ]);

  return { hasPaidCommission: (count ?? 0) > 0 };
}

/** Catat pemasukan servis sekali saja (idempoten). */
export async function recordServiceIncome(
  supabase: DB,
  invoiceId: string,
  total: number,
  noNota: string
) {
  const { data: existing } = await supabase
    .from("ledgers")
    .select("id")
    .eq("ref_type", "service_invoices")
    .eq("ref_id", invoiceId)
    .limit(1);

  if (existing && existing.length > 0) return;

  await supabase.from("ledgers").insert({
    tanggal: todayISO(),
    tipe: "masuk",
    kategori: "servis",
    jumlah: total,
    ref_type: "service_invoices",
    ref_id: invoiceId,
    keterangan: noNota,
  });
}

/** Tandai servis SELESAI + catat pemasukan di jurnal (laba rugi). */
export async function completeServiceInvoice(
  supabase: DB,
  invoiceId: string,
  total: number,
  noNota: string
) {
  const { error } = await supabase
    .from("service_invoices")
    .update({ status: "selesai" })
    .eq("id", invoiceId);
  if (error) throw error;
  await recordServiceIncome(supabase, invoiceId, total, noNota);
}

/* ============================================================
   PEMBELIAN (BARANG MASUK)
   ============================================================ */
export async function reverseInboundStock(supabase: DB, invoiceId: string) {
  const totals = aggregateQty(await stockLines(supabase, "barang_masuk", invoiceId));
  if (totals.size === 0) return;

  const stock = await currentStock(supabase, [...totals.keys()]);
  const mutations: Record<string, unknown>[] = [];

  await Promise.all(
    [...totals.entries()].map(async ([itemId, qty]) => {
      const before = stock.get(itemId) ?? 0;
      const after = Math.max(0, before - qty);
      const { error } = await supabase.from("items").update({ stok: after }).eq("id", itemId);
      if (error) throw error;
      mutations.push({
        item_id: itemId,
        tanggal: todayISO(),
        jenis: "keluar",
        qty,
        stok_sebelum: before,
        stok_sesudah: after,
        ref_type: "reverse_inbound",
        ref_id: invoiceId,
        note: "Batal pembelian",
      });
    })
  );

  if (mutations.length > 0) await supabase.from("stock_mutations").insert(mutations);
}

export async function deleteInboundInvoice(supabase: DB, invoiceId: string) {
  await reverseInboundStock(supabase, invoiceId);
  await supabase
    .from("invoice_details")
    .delete()
    .eq("invoice_type", "barang_masuk")
    .eq("invoice_id", invoiceId);
  const { error } = await supabase.from("inbound_invoices").delete().eq("id", invoiceId);
  if (error) throw error;
}

export async function prepareInboundForResave(supabase: DB, invoiceId: string) {
  await reverseInboundStock(supabase, invoiceId);
  await supabase
    .from("invoice_details")
    .delete()
    .eq("invoice_type", "barang_masuk")
    .eq("invoice_id", invoiceId);
}
