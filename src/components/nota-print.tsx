"use client";

import { useState } from "react";
import { formatRupiah, formatDate } from "@/lib/format";
import { Printer } from "lucide-react";

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

type PaperSize = "a4" | "thermal80" | "thermal58";

const PAPERS: { id: PaperSize; label: string; width: string; page: string }[] = [
  { id: "a4", label: "A4", width: "w-full max-w-[210mm]", page: "@page { size: A4; margin: 10mm; }" },
  { id: "thermal80", label: "Thermal 80mm", width: "w-full max-w-[80mm]", page: "@page { size: 80mm auto; margin: 2mm; }" },
  { id: "thermal58", label: "Thermal 58mm", width: "w-full max-w-[58mm]", page: "@page { size: 58mm auto; margin: 2mm; }" },
];

export default function NotaPrint({
  company, title, noNota, tanggal, customerLabel, statusLabel,
  lines, subtotal, diskon, total, note, extra,
}: NotaPrintProps) {
  const [size, setSize] = useState<PaperSize>("a4");
  const paper = PAPERS.find((p) => p.id === size) ?? PAPERS[0];
  const compact = size !== "a4";

  return (
    <div>
      {/* Toolbar (tidak ikut tercetak) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          {PAPERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSize(p.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                size === p.id
                  ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-700/25 transition hover:from-blue-500 hover:to-blue-600"
        >
          <Printer className="h-4 w-4" />
          Cetak Nota
        </button>
      </div>

      <style>{paper.page}</style>

      <div className="overflow-x-auto pb-2">
        <div
          className={`mx-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.06)] print:rounded-none print:border-0 print:p-0 print:shadow-none ${paper.width}`}
        >
          {/* Kop */}
          <div className="flex items-start gap-3 border-b border-dashed border-slate-300 pb-3">
            {company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logo_url}
                alt={company.company_name}
                className={`shrink-0 rounded-xl object-contain ${compact ? "h-9 w-9" : "h-14 w-14"}`}
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <h1 className={`font-black uppercase leading-tight tracking-tight ${compact ? "text-sm" : "text-xl"}`}>
                {company.company_name || "OtoFlow Pro"}
              </h1>
              {company.address && <p className={`leading-snug text-slate-500 ${compact ? "text-[9px]" : "text-xs"}`}>{company.address}</p>}
              {company.phone && <p className={`text-slate-500 ${compact ? "text-[9px]" : "text-xs"}`}>Telp. {company.phone}</p>}
            </div>
            <div className="shrink-0 text-right">
              <span className={`inline-block rounded-md bg-slate-900 px-2 py-1 font-bold uppercase tracking-wide text-white ${compact ? "text-[8px]" : "text-[10px]"}`}>
                {title}
              </span>
            </div>
          </div>

          {/* Info nota */}
          <div className={`mt-3 space-y-0.5 ${compact ? "text-[9px]" : "text-xs"}`}>
            <div className="flex justify-between gap-3"><span className="text-slate-500">No. Nota</span><span className="font-mono font-bold">{noNota}</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Tanggal</span><span>{formatDate(tanggal)}</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Pelanggan</span><span className="text-right font-semibold">{customerLabel}</span></div>
            {statusLabel && <div className="flex justify-between gap-3"><span className="text-slate-500">Status</span><span className="font-semibold">{statusLabel}</span></div>}
            {extra}
          </div>

          {/* Item */}
          <table className={`mt-3 w-full border-collapse text-left ${compact ? "text-[9px]" : "text-xs"}`}>
            <thead>
              <tr className="border-b border-slate-300">
                <th className="py-1.5 pr-1 font-bold uppercase tracking-wide text-slate-500">Item</th>
                <th className="py-1.5 px-1 text-center font-bold uppercase tracking-wide text-slate-500">Qty</th>
                <th className="py-1.5 px-1 text-right font-bold uppercase tracking-wide text-slate-500">Harga</th>
                {!compact && <th className="py-1.5 px-1 text-right font-bold uppercase tracking-wide text-slate-500">Diskon</th>}
                <th className="py-1.5 pl-2 text-right font-bold uppercase tracking-wide text-slate-500">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 pr-1 leading-snug">{l.nama}</td>
                  <td className="py-1.5 px-1 text-center">{l.qty}</td>
                  <td className="py-1.5 px-1 text-right">{formatRupiah(l.harga)}</td>
                  {!compact && <td className="py-1.5 px-1 text-right text-slate-500">{formatRupiah(l.diskon)}</td>}
                  <td className="py-1.5 pl-2 text-right font-semibold">{formatRupiah(l.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div className={`mt-3 space-y-1 border-t border-dashed border-slate-300 pt-2 ${compact ? "text-[9px]" : "text-xs"}`}>
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatRupiah(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Diskon</span><span>- {formatRupiah(diskon)}</span></div>
            <div className={`mt-1 flex justify-between rounded-lg bg-slate-900 px-2 py-1.5 font-bold text-white ${compact ? "text-[10px]" : "text-sm"}`}>
              <span>TOTAL</span>
              <span>{formatRupiah(total)}</span>
            </div>
          </div>

          {note ? (
            <p className={`mt-3 rounded-lg bg-slate-50 px-2 py-1.5 italic text-slate-500 ${compact ? "text-[8px]" : "text-xs"}`}>
              Catatan: {note}
            </p>
          ) : null}

          <p className={`mt-4 text-center text-slate-500 ${compact ? "text-[8px]" : "text-xs"}`}>
            Terima kasih atas kunjungan Anda!
          </p>
          <p className={`text-center text-slate-400 ${compact ? "text-[7px]" : "text-[10px]"}`}>
            Nota ini dicetak otomatis oleh OtoFlow Pro
          </p>
        </div>
      </div>
    </div>
  );
}
