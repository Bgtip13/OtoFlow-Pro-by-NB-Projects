import { todayISO } from "@/lib/format";

// Kembalikan stok untuk semua detail barang sebuah nota
export async function restoreStock(supabase: any, invoiceType: string, invoiceId: string) {
  const { data: details } = await supabase
    .from("invoice_details")
    .select("*")
    .eq("invoice_type", invoiceType)
    .eq("invoice_id", invoiceId);
  if (!details) return;
  for (const d of details.filter((x: any) => x.item_type === "barang")) {
    const { data: cur } = await supabase.from("items").select("stok").eq("id", d.item_id).single();
    const before = cur?.stok ?? 0;
    const after = before + d.qty;
    await supabase.from("items").update({ stok: after }).eq("id", d.item_id);
    await supabase.from("stock_mutations").insert({
      item_id: d.item_id,
      tanggal: todayISO(),
      jenis: "masuk",
      qty: d.qty,
      stok_sebelum: before,
      stok_sesudah: after,
      ref_type: "restore",
      ref_id: invoiceId,
      note: "Restok (edit/hapus nota)",
    });
  }
}

// ===== PENJUALAN =====
export async function deleteSalesInvoice(supabase: any, invoiceId: string) {
  await restoreStock(supabase, "penjualan", invoiceId);
  await supabase.from("invoice_details").delete().eq("invoice_type", "penjualan").eq("invoice_id", invoiceId);
  await supabase.from("receivables").delete().eq("sales_invoice_id", invoiceId);
  await supabase.from("ledgers").delete().eq("ref_type", "sales_invoices").eq("ref_id", invoiceId);
  await supabase.from("sales_invoices").delete().eq("id", invoiceId);
}

export async function prepareSalesForResave(supabase: any, invoiceId: string) {
  await restoreStock(supabase, "penjualan", invoiceId);
  await supabase.from("invoice_details").delete().eq("invoice_type", "penjualan").eq("invoice_id", invoiceId);
  await supabase.from("receivables").delete().eq("sales_invoice_id", invoiceId);
  await supabase.from("ledgers").delete().eq("ref_type", "sales_invoices").eq("ref_id", invoiceId);
}

// ===== SERVIS =====
export async function deleteServiceInvoice(supabase: any, invoiceId: string) {
  await restoreStock(supabase, "servis", invoiceId);
  await supabase.from("invoice_details").delete().eq("invoice_type", "servis").eq("invoice_id", invoiceId);
  await supabase.from("mechanic_commissions").delete().eq("service_invoice_id", invoiceId);
  await supabase.from("ledgers").delete().eq("ref_type", "service_invoices").eq("ref_id", invoiceId);
  await supabase.from("service_invoices").delete().eq("id", invoiceId);
}

export async function prepareServiceForResave(supabase: any, invoiceId: string) {
  await restoreStock(supabase, "servis", invoiceId);
  await supabase.from("invoice_details").delete().eq("invoice_type", "servis").eq("invoice_id", invoiceId);
  await supabase.from("mechanic_commissions").delete().eq("service_invoice_id", invoiceId);
  await supabase.from("ledgers").delete().eq("ref_type", "service_invoices").eq("ref_id", invoiceId);
}

// Tandai servis SELESAI + catat pemasukan di jurnal (laba rugi)
export async function completeServiceInvoice(
  supabase: any,
  invoiceId: string,
  total: number,
  noNota: string
) {
  const { error } = await supabase
    .from("service_invoices")
    .update({ status: "selesai" })
    .eq("id", invoiceId);
  if (error) throw error;
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
// ===== PEMBELIAN (BARANG MASUK) =====
export async function reverseInboundStock(supabase: any, invoiceId: string) {
  const { data: details } = await supabase
    .from("invoice_details")
    .select("*")
    .eq("invoice_type", "barang_masuk")
    .eq("invoice_id", invoiceId);
  if (!details) return;
  for (const d of details) {
    const { data: cur } = await supabase.from("items").select("stok").eq("id", d.item_id).single();
    const before = cur?.stok ?? 0;
    const after = Math.max(0, before - d.qty);
    await supabase.from("items").update({ stok: after }).eq("id", d.item_id);
    await supabase.from("stock_mutations").insert({
      item_id: d.item_id,
      tanggal: todayISO(),
      jenis: "keluar",
      qty: d.qty,
      stok_sebelum: before,
      stok_sesudah: after,
      ref_type: "reverse_inbound",
      ref_id: invoiceId,
      note: "Batal pembelian",
    });
  }
}

export async function deleteInboundInvoice(supabase: any, invoiceId: string) {
  await reverseInboundStock(supabase, invoiceId);
  await supabase.from("invoice_details").delete().eq("invoice_type", "barang_masuk").eq("invoice_id", invoiceId);
  await supabase.from("inbound_invoices").delete().eq("id", invoiceId);
}

export async function prepareInboundForResave(supabase: any, invoiceId: string) {
  await reverseInboundStock(supabase, invoiceId);
  await supabase.from("invoice_details").delete().eq("invoice_type", "barang_masuk").eq("invoice_id", invoiceId);
}
