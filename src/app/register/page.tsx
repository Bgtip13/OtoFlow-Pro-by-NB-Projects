"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, KeyRound, Lock, ShieldCheck, User, UserPlus } from "lucide-react";

const inputBase =
  "h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 shadow-[0_1px_1px_rgba(15,23,42,0.03)] placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:outline-none";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const email = `${username.trim().toLowerCase()}@otoflow.local`;

    // 1. Validasi kode aktivasi lewat fungsi database (aman sebelum login)
    const { data: valid, error: validError } = await supabase.rpc("validate_activation_code", {
      p_code: code.trim(),
    });

    if (validError || !valid) {
      setError("Kode aktivasi tidak valid atau sudah dipakai.");
      setLoading(false);
      return;
    }

    // 2. Daftar akun
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim().toLowerCase() } },
    });

    if (error || !data.user) {
      setError(error?.message || "Gagal mendaftar. Coba lagi.");
      setLoading(false);
      return;
    }

    // 3. Tandai kode sudah terpakai (pakai fungsi database)
    await supabase.rpc("consume_activation_code", {
      p_code: code.trim(),
      p_user_id: data.user.id,
    });

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Panel brand */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-10 lg:flex">
        <div className="pointer-events-none absolute -left-24 bottom-1/4 h-80 w-80 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -top-16 right-0 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="OtoFlow Pro" className="h-14 w-14 rounded-2xl bg-white object-contain p-0.5 shadow-lg shadow-violet-500/30" />
          <div>
            <div className="text-base font-bold tracking-tight text-white">OtoFlow Pro</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">by NB Projects</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
            Satu aplikasi untuk<br />
            <span className="bg-gradient-to-r from-violet-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent">seluruh operasional bengkel.</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Daftarkan akun dengan kode aktivasi dari admin. Setelah aktif, Anda bisa langsung membuat
            nota penjualan, nota servis, dan memantau stok.
          </p>

          <div className="mt-8 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-inset ring-white/15 backdrop-blur">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
              Butuh kode aktivasi?
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-400">
              Hubungi administrator bengkel Anda untuk mendapatkan kode aktivasi sekali pakai sebelum
              melakukan pendaftaran.
            </p>
          </div>
        </div>

        <p className="relative text-[11px] text-slate-500">
          © {new Date().getFullYear()} OtoFlow Pro · by NB Projects
        </p>
      </div>

      {/* Panel form */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-sm animate-page-in">
          <div className="mb-5 flex flex-col items-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="OtoFlow Pro" className="h-16 w-16 rounded-3xl bg-white object-contain p-1 shadow-xl shadow-violet-500/25" />
            <h1 className="mt-2 text-lg font-bold tracking-tight text-slate-900">Daftar Akun</h1>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/75 p-6 shadow-[0_1px_2px_rgba(45,30,128,0.05),0_30px_60px_-30px_rgba(86,54,242,0.45)] ring-1 ring-blue-200/40 backdrop-blur-2xl">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Buat akun baru</h1>
            <p className="mt-1 text-[13px] text-slate-500">Isi data di bawah untuk mulai menggunakan aplikasi.</p>

            <form onSubmit={handleRegister} className="mt-5 space-y-3.5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Username</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="Contoh: admin_bengkel"
                    className={inputBase}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Minimal 6 karakter"
                    className={inputBase}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Ulangi Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Ketik ulang password"
                    className={inputBase}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Kode Aktivasi</label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                    placeholder="Masukkan kode dari admin"
                    className={`${inputBase} font-mono uppercase`}
                  />
                </div>
              </div>

              {error && (
                <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600 ring-1 ring-inset ring-red-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-btn text-sm font-semibold text-white shadow-brand transition hover:brightness-110 focus-visible:ring-4 focus-visible:ring-blue-500/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {loading ? "Memproses..." : "Daftar"}
              </button>
            </form>

            <p className="mt-5 text-center text-[13px] text-slate-500">
              Sudah punya akun?{" "}
              <Link href="/login" className="font-semibold text-blue-600 hover:text-violet-600 hover:underline">
                Masuk
              </Link>
            </p>
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-400 lg:hidden">
            © {new Date().getFullYear()} OtoFlow Pro · by NB Projects
          </p>
        </div>
      </div>
    </div>
  );
}
