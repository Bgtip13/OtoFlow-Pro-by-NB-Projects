"use client";

import { useState } from "react";
import { formatRupiah, formatDate } from "@/lib/format";

type PrintLine = {
  nama: string;
  qty: number;
  harga: number;
  diskon: number;
  subtotal: number;
};

type NotaPrintProps = {
  company: { company_name: string; address: string; phone: string; logo_url: string };
  title: string;
  noNota: string;
  tanggal: string;
  customerLabel: string;
  statusLabel?: string;
  lines: PrintLine[];
  subtotal: number;
  diskon: number;
  total: number;
  note?: string;
  extra?: React.ReactNode;
};

export default function NotaPrint({
  company, title, noNota, tanggal, customerLabel, statusLabel,
  lines, subtotal, diskon, total, note, extra,
}: NotaPrintProps) {
  const [size, setSize] = useState<"a4" | "thermal58" | "thermal80">("a4");

  const widthClass =
    size === "a4" ? "w-[210mm]" : size === "thermal80" ? "w-[80mm]" : "w-[58mm]";

  return (
    <div>
      {/* Toolbar (tidak ikut tercetak) */}
      <div className="print:hidden mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button onClick={() => setSize("a4")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${size === "a4" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-600"}`}>
            A4
          </button>
          <button onClick={() => setSize("thermal80")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${size === "thermal80" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-600"}`}>
            Thermal 80mm
          </button>
          <button onClick={() => setSize("thermal58")} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${size === "thermal58" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-600"}`}>
            Thermal 58mm
          </button>
        </div>
        <button onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          🖨 Cetak
        </button>
      </div>

      {/* Ukuran kertas saat print */}
      {size === "a4" && <style>{`@page { size: A4; margin: 10mm; }`}</style>}
      {size === "thermal58" && <style>{`@page { size: 58mm auto; margin: 2mm; }`}</style>}
      {size === "thermal80" && <style>{`@page { size: 80mm auto; margin: 2mm; }`}</style>}

      {/* Area nota */}
      <div className={`mx-auto rounded-lg border border-slate-200 bg-white p-4 shadow print:rounded-none print:border-0 print:shadow-none ${widthClass}`}>
        <div className="text-center">
          {company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt={company.company_name} className="mx-auto mb-1 h-12 object-contain" />
          ) : null}
          <h1 className="text-lg font-bold">{company.company_name || "OtoFlow Pro"}</h1>
          <p className="text-xs">{company.address}</p>
          <p className="text-xs">{company.phone}</p>
        </div>

        <div className="mt-3 border-y border-slate-300 py-2 text-center">
          <span className="text-sm font-bold uppercase tracking-wide">{title}</span>
        </div>

        <div className="mt-2 space-y-0.5 text-xs">
          <div className="flex justify-between"><span>No. Nota</span><span className="font-mono font-semibold">{noNota}</span></div>
          <div className="flex justify-between"><span>Tanggal</span><span>{formatDate(tanggal)}</span></div>
          <div className="flex justify-between"><span>Pelanggan</span><span className="font-semibold">{customerLabel}</span></div>
          {statusLabel && <div className="flex justify-between"><span>Status</span><span>{statusLabel}</span></div>}
          {extra}
        </div>

        <table className="mt-3 w-full text-left text-xs">
          <thead className="border-b border-slate-300">
            <tr>
              <th className="py-1">Nama</th>
              <th className="py-1 text-center">Qty</th>
              <th className="py-1 text-right">Harga</th>
              <th className="py-1 text-right">Diskon</th>
              <th className="py-1 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-1">{l.nama}</td>
                <td className="py-1 text-center">{l.qty}</td>
                <td className="py-1 text-right">{formatRupiah(l.harga)}</td>
                <td className="py-1 text-right">{formatRupiah(l.diskon)}</td>
                <td className="py-1 text-right font-semibold">{formatRupiah(l.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2 space-y-0.5 text-xs">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatRupiah(subtotal)}</span></div>
          <div className="flex justify-between"><span>Diskon</span><span>- {formatRupiah(diskon)}</span></div>
          <div className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{formatRupiah(total)}</span></div>
        </div>

        {note ? <p className="mt-3 text-xs italic">Catatan: {note}</p> : null}
        <p className="mt-4 text-center text-xs">Terima kasih atas kunjungan Anda!</p>
      </div>
    </div>
  );
}
