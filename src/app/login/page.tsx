"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, BarChart3, Eye, EyeOff, Lock, LogIn, User, Wrench } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    // workaround: username dikonversi jadi email virtual di belakang layar
    const email = `${username.trim().toLowerCase()}@otoflow.local`;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Username atau password salah.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Panel brand */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-10 lg:flex">
        <div className="pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="OtoFlow Pro" className="h-12 w-12 rounded-2xl bg-white/10 object-contain p-1" />
          <div>
            <div className="text-base font-bold tracking-tight text-white">OtoFlow Pro</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">by NB Projects</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white">
            Kelola bengkel Anda<br />
            <span className="text-blue-400">lebih rapi dan cepat.</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Kasir penjualan, nota servis, stok sparepart, komisi mekanik, sampai laporan laba rugi —
            semuanya dalam satu aplikasi.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { icon: Wrench, text: "Nota servis & penjualan siap cetak" },
              { icon: BarChart3, text: "Laporan omset dan laba rugi otomatis" },
              { icon: Lock, text: "Data tersimpan aman di cloud" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-inset ring-white/10">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
                  <f.icon className="h-4 w-4" />
                </span>
                <span className="text-[13px] text-slate-300">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] text-slate-500">
          © {new Date().getFullYear()} OtoFlow Pro · by NB Projects
        </p>
      </div>

      {/* Panel form */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-sm animate-page-in">
          <div className="mb-6 flex flex-col items-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="OtoFlow Pro" className="h-16 w-16 rounded-2xl bg-white object-contain p-1 shadow-sm" />
            <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900">OtoFlow Pro</h1>
            <p className="text-xs text-slate-400">by NB Projects</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-32px_rgba(15,23,42,0.35)]">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Masuk ke akun</h1>
            <p className="mt-1 text-[13px] text-slate-500">Gunakan username dan password bengkel Anda.</p>

            <form onSubmit={handleLogin} className="mt-5 space-y-3.5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Username</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="Masukkan username"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 shadow-[0_1px_1px_rgba(15,23,42,0.03)] placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Masukkan password"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-800 shadow-[0_1px_1px_rgba(15,23,42,0.03)] placeholder:text-slate-400 transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-600"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 text-sm font-semibold text-white shadow-sm shadow-blue-700/25 transition hover:from-blue-500 hover:to-blue-600 focus-visible:ring-4 focus-visible:ring-blue-500/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {loading ? "Memproses..." : "Masuk"}
              </button>
            </form>

            <p className="mt-5 text-center text-[13px] text-slate-500">
              Belum punya akun?{" "}
              <Link href="/register" className="font-semibold text-blue-600 hover:underline">
                Daftar di sini
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
