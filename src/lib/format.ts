export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n || 0);
}

// Format tanggal SELALU dd/mm/yyyy (tidak bergantung locale browser)
export function formatDate(d: string | Date): string {
  let date: Date;
  if (typeof d === "string") {
    // tanggal murni "YYYY-MM-DD" -> anggap waktu lokal, hindari geser 1 hari
    date = new Date(d.length === 10 ? d + "T00:00:00" : d);
  } else {
    date = d;
  }
  if (isNaN(date.getTime())) return "-";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
