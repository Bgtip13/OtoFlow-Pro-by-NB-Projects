"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, Lock, User, UserPlus } from "lucide-react";

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
    const { data: valid, error: validError } = await supabase.rpc(
      "validate_activation_code",
      { p_code: code.trim() }
    );

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 px-4 py-8">
      {/* Dekorasi background senada login */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <form onSubmit={handleRegister} className="rounded-2xl bg-white p-8 shadow-2xl">
          {/* Logo + Nama Aplikasi — di tengah */}
          <div className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="OtoFlow Pro"
              className="h-16 w-16 rounded-2xl object-contain shadow-md"
            />
            <h1 className="mt-3 text-2xl font-bold text-slate-800">Daftar Akun</h1>
            <p className="mt-1 text-sm text-slate-400">OtoFlow Pro · by NB Projects</p>
          </div>

          <div className="my-6 border-t border-slate-100" />

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Contoh: admin_bengkel"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ulangi Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Ketik ulang password"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Kode Aktivasi</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  placeholder="Masukkan kode dari admin"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {loading ? "Memproses..." : "Daftar"}
          </button>

          <p className="mt-5 text-center text-sm text-slate-500">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:underline">
              Masuk
            </Link>
          </p>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} OtoFlow Pro · by NB Projects
        </p>
      </div>
    </div>
  );
}
