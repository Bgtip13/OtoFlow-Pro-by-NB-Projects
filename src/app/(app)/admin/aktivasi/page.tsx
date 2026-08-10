"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { Dices, Plus, ShieldCheck, Trash2 } from "lucide-react";

const PAGE_SIZE = 20;

type Code = {
  id: string;
  code: string;
  used: boolean;
  used_at: string | null;
  created_at: string;
};

function randomCode() {
  const part = () =>
    Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OTOF-${part()}-${part()}`;
}

export default function AdminAktivasiPage() {
  const supabase = createClient();
  const toast = useToast();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Code[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setAllowed(profile?.role === "admin");
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    const { data, count } = await supabase
      .from("activation_codes")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (data) {
      setRows(data as Code[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }

  async function handleCreate() {
    const code = newCode.trim().toUpperCase();
    if (!code) {
      toast.error("Kode aktivasi tidak boleh kosong.");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("activation_codes").insert({ code });
    if (error) {
      toast.error(error.message);
      setCreating(false);
      return;
    }
    toast.success(`Kode ${code} berhasil dibuat.`);
    setNewCode("");
    setCreating(false);
    setPage(0);
    load();
  }

  async function handleDelete(c: Code) {
    if (c.used) {
      if (!confirm(`Kode ${c.code} SUDAH DIPAKAI. Hapus tetap?`)) return;
    } else {
      if (!confirm(`Hapus kode ${c.code}?`)) return;
    }
    const { error } = await supabase.from("activation_codes").delete().eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Kode dihapus.");
    load();
  }

  if (allowed === null) return <p className="text-sm text-slate-400">Memeriksa...</p>;
  if (!allowed) return <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">Akses ditolak. Halaman khusus admin.</p>;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader icon={ShieldCheck} title="Panel Admin — Kode Aktivasi" subtitle={`${total} kode · kode dipakai 1x untuk register`} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="Ketik kode atau klik Generate"
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none"
        />
        <button onClick={() => setNewCode(randomCode())} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <Dices className="h-3.5 w-3.5" /> Generate
        </button>
        <button onClick={handleCreate} disabled={creating}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          <Plus className="h-4 w-4" /> {creating ? "Membuat..." : "Buat Kode"}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-2 py-1.5">Kode</th>
              <th className="px-2 py-1.5">Status</th>
              <th className="px-2 py-1.5">Dibuat</th>
              <th className="px-2 py-1.5">Dipakai</th>
              <th className="px-2 py-1.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-400">Memuat...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-400">Belum ada kode.</td></tr>}
            {!loading &&
              rows.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-2 py-1 font-mono font-semibold">{c.code}</td>
                  <td className="px-2 py-1">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      c.used ? "bg-slate-200 text-slate-600" : "bg-green-100 text-green-700"
                    }`}>
                      {c.used ? "DIPAKAI" : "AKTIF"}
                    </span>
                  </td>
                  <td className="px-2 py-1">{formatDate(c.created_at)}</td>
                  <td className="px-2 py-1">{c.used_at ? formatDate(c.used_at) : "-"}</td>
                  <td className="px-2 py-1 text-right">
                    <button onClick={() => handleDelete(c)} className="text-red-600 hover:underline"><Trash2 className="mr-0.5 inline h-3.5 w-3.5 align-text-bottom" />Hapus</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>Halaman {page + 1} dari {totalPages} · {total} data</span>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">← Sebelumnya</button>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">Berikutnya →</button>
        </div>
      </div>
    </div>
  );
}
