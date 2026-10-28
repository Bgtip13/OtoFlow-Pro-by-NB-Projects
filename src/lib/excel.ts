/**
 * Excel (xlsx) berukuran besar, sehingga hanya dimuat saat pengguna benar-benar
 * menekan tombol impor/ekspor. Dulu library ini ikut di bundel awal
 * halaman database sehingga halaman terasa lambat dibuka.
 */
let loader: Promise<typeof import("xlsx")> | null = null;

export function loadXLSX() {
  if (!loader) loader = import("xlsx");
  return loader;
}

export async function downloadExcel(
  headers: string[],
  rows: (string | number)[][],
  sheetName: string,
  fileName: string
) {
  const XLSX = await loadXLSX();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

export async function readExcelRows(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await loadXLSX();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]);
}
