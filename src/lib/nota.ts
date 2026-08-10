// Generator nomor nota otomatis: SI-YYYYMMDD-0001, SRV-..., INV-...
export async function generateNoNota(
  supabase: any,
  prefix: "SI" | "SRV" | "INV"
): Promise<string> {
  const table =
    prefix === "SI" ? "sales_invoices"
    : prefix === "SRV" ? "service_invoices"
    : "inbound_invoices";

  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;

  const pat = `${prefix}-${ymd}-%`;
  const { data } = await supabase
    .from(table)
    .select("no_nota")
    .ilike("no_nota", pat)
    .order("no_nota", { ascending: false })
    .limit(1);

  let seq = 1;
  if (data && data.length > 0) {
    const last = String(data[0].no_nota);
    const num = parseInt(last.split("-").pop() || "0", 10);
    seq = (num || 0) + 1;
  }
  return `${prefix}-${ymd}-${String(seq).padStart(4, "0")}`;
}
