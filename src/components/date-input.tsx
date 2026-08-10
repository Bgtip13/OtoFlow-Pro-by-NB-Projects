"use client";

// Input tanggal format dd/mm/yyyy (tidak bergantung locale browser)
export default function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [y, m, d] = value && value.length === 10
    ? value.split("-").map(Number)
    : [new Date().getFullYear(), 1, 1];

  const days = new Date(y, m, 0).getDate();
  const dayOptions = Array.from({ length: days }, (_, i) => i + 1);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const yearOptions = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  function setPart(part: "y" | "m" | "d", val: number) {
    let ny = y, nm = m, nd = d;
    if (part === "y") ny = val;
    if (part === "m") nm = val;
    if (part === "d") nd = val;
    const maxDay = new Date(ny, nm, 0).getDate();
    if (nd > maxDay) nd = maxDay;
    onChange(`${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`);
  }

  return (
    <div className="flex items-center gap-1">
      <select value={d} onChange={(e) => setPart("d", Number(e.target.value))}
        className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
        {dayOptions.map((x) => <option key={x} value={x}>{String(x).padStart(2, "0")}</option>)}
      </select>
      <span className="text-slate-400">/</span>
      <select value={m} onChange={(e) => setPart("m", Number(e.target.value))}
        className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
        {monthNames.map((name, i) => <option key={i} value={i + 1}>{String(i + 1).padStart(2, "0")} ({name})</option>)}
      </select>
      <span className="text-slate-400">/</span>
      <select value={y} onChange={(e) => setPart("y", Number(e.target.value))}
        className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
        {yearOptions.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
      </select>
    </div>
  );
}
