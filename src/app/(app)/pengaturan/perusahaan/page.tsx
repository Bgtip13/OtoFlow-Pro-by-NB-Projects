"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { Button, Card, CardTitle, Field, Input } from "@/components/ui";
import { Building2, ImageUp, Save } from "lucide-react";

export default function ProfilPerusahaanPage() {
  const supabase = createClient();
  const toast = useToast();
  const [form, setForm] = useState({ company_name: "", address: "", phone: "" });
  const [logoUrl, setLogoUrl] = useState("/logo.png");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
      if (data) {
        setForm({
          company_name: data.company_name || "OtoFlow Pro",
          address: data.address || "",
          phone: data.phone || "",
        });
        setLogoUrl(data.logo_url || "/logo.png");
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogo(file: File) {
    if (file.size > 1024 * 1024) {
      toast.error("Ukuran logo maksimal 1MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `logo-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (upErr) {
      toast.error(`Upload gagal: ${upErr.message}`);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("logos").getPublicUrl(path);
    const url = data.publicUrl;
    await supabase.from("settings").update({ logo_url: url }).eq("id", 1);
    setLogoUrl(url);
    toast.success("Logo perusahaan diperbarui.");
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim()) {
      toast.error("Nama perusahaan wajib diisi.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("settings")
      .update({
        company_name: form.company_name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
      })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profil perusahaan disimpan.");
  }

  return (
    <div>
      <PageHeader icon={Building2} title="Profil Perusahaan" subtitle="Tampil di header, sidebar, dan cetak nota" />

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardTitle icon={Building2}>Info Perusahaan</CardTitle>
          <form onSubmit={handleSave} className="mt-4 space-y-3">
            <Field label="Nama Perusahaan *">
              <Input
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder="OtoFlow Pro"
                disabled={loading}
              />
            </Field>
            <Field label="Alamat">
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Jl. Contoh No. 1, Kota"
                disabled={loading}
              />
            </Field>
            <Field label="No. Telepon / HP">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0812xxxxxxx"
                disabled={loading}
              />
            </Field>
            <div className="flex justify-end pt-1">
              <Button type="submit" variant="primary" icon={Save} loading={saving}>
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardTitle icon={ImageUp}>Logo Perusahaan</CardTitle>
          <div className="mt-4 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Logo"
              className="h-20 w-20 rounded-2xl border border-slate-200 bg-slate-50 object-contain p-1.5"
            />
            <div>
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-700/25 transition hover:from-blue-500 hover:to-blue-600">
                <ImageUp className="h-4 w-4" />
                {uploading ? "Mengupload..." : "Ganti Logo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogo(f);
                  }}
                />
              </label>
              <p className="mt-2 text-xs text-slate-400">PNG/JPG/WebP, disarankan bentuk kotak, maks 1MB.</p>
            </div>
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500">
            Logo otomatis dipakai di header, sidebar, cetak nota, dan dropdown akun. Perubahan langsung
            terlihat setelah halaman dimuat ulang.
          </p>
        </Card>
      </div>
    </div>
  );
}
