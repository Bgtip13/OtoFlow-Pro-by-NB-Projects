"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import PageHeader from "@/components/page-header";
import { Building2, Save } from "lucide-react";

export default function ProfilPerusahaanPage() {
  const supabase = createClient();
  const toast = useToast();
  const [form, setForm] = useState({ company_name: "", address: "", phone: "" });
  const [logoUrl, setLogoUrl] = useState("/logo.png");
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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogo(file: File) {
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
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    toast.success("Profil perusahaan disimpan.");
    setSaving(false);
  }

  return (
    <div>
      <PageHeader icon={Building2} title="Profil Perusahaan" subtitle="Tampil di header, sidebar, dan cetak nota" />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-700">Info Perusahaan</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Nama Perusahaan *</label>
              <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Alamat</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">No. Telepon / HP</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-700">Logo Perusahaan</h2>
          <div className="mt-4 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo" className="h-20 w-20 rounded-xl border border-slate-200 object-contain p-1" />
            <div>
              <label className="inline-block cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                {uploading ? "Mengupload..." : "Ganti Logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogo(f);
                  }}
                />
              </label>
              <p className="mt-2 text-xs text-slate-400">PNG/JPG, ukuran kotak, maks 1MB</p>
            </div>
          </div>
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Logo ini otomatis dipakai di header, sidebar, cetak nota, dan dropdown akun. Perubahan langsung terlihat tanpa restart.
          </p>
        </div>
      </div>
    </div>
  );
}
