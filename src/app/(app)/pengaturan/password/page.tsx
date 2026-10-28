"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { Button, Card, CardTitle, Field, Input } from "@/components/ui";
import { KeyRound, ShieldCheck } from "lucide-react";

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

    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password berhasil diganti.");
    setCurrent("");
    setNewPw("");
    setConfirm("");
  }

  return (
    <div>
      <PageHeader icon={KeyRound} title="Ganti Password" subtitle="Ganti password login akun Anda" />

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card>
          <CardTitle icon={KeyRound}>Formulir Password</CardTitle>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <Field label="Password Lama">
              <Input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Password saat ini"
              />
            </Field>
            <Field label="Password Baru" hint="Minimal 6 karakter.">
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Password baru"
              />
            </Field>
            <Field label="Ulangi Password Baru">
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Ketik ulang password baru"
              />
            </Field>
            <div className="flex justify-end pt-1">
              <Button type="submit" variant="primary" icon={ShieldCheck} loading={saving}>
                {saving ? "Menyimpan..." : "Ganti Password"}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-white">
          <CardTitle icon={ShieldCheck}>Tips Keamanan</CardTitle>
          <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-slate-500">
            <li>• Gunakan kombinasi huruf besar, kecil, angka, dan simbol.</li>
            <li>• Jangan pakai password yang sama dengan akun lain.</li>
            <li>• Ganti password secara berkala, terutama setelah petugas berganti.</li>
            <li>• Jangan bagikan password kepada siapa pun, termasuk sesama staf.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
