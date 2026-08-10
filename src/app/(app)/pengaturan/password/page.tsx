"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { KeyRound, Save } from "lucide-react";

export default function GantiPasswordPage() {
  const supabase = createClient();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 6) {
      toast.error("Password baru minimal 6 karakter.");
      return;
    }
    if (newPw !== confirm) {
      toast.error("Konfirmasi password tidak sama.");
      return;
    }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      toast.error("Tidak dapat memuat akun.");
      setSaving(false);
      return;
    }

    const { error: errSign } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (errSign) {
      toast.error("Password lama salah.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    toast.success("Password berhasil diganti.");
    setCurrent("");
    setNewPw("");
    setConfirm("");
    setSaving(false);
  }

  return (
    <div>
      <PageHeader icon={KeyRound} title="Ganti Password" subtitle="Ganti password login akun Anda" />

      <form onSubmit={handleSubmit} className="mt-4 max-w-md rounded-xl border border-slate-200 bg-white p-6">
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Password Lama</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Password Baru</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required placeholder="Minimal 6 karakter"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Ulangi Password Baru</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button type="submit" disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? "Menyimpan..." : "Ganti Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
