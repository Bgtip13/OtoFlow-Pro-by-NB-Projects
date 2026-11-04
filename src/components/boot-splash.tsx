"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "otoflow:booted";

/**
 * Splash screen beranimasi saat aplikasi pertama kali dibuka.
 * Hanya tampil sekali per sesi tab agar tidak mengganggu saat pindah menu.
 */
export default function BootSplash() {
  const [phase, setPhase] = useState<"show" | "leaving" | "hidden">("show");

  useEffect(() => {
    let alreadyBooted = false;
    try {
      alreadyBooted = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      alreadyBooted = false;
    }

    if (alreadyBooted) {
      setPhase("hidden");
      return;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* sessionStorage tidak tersedia — splash tetap jalan sekali */
    }

    const leave = setTimeout(() => setPhase("leaving"), 900);
    const done = setTimeout(() => setPhase("hidden"), 1250);

    return () => {
      clearTimeout(leave);
      clearTimeout(done);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-sidebar transition-opacity duration-300 ${
        phase === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* Dekorasi latar */}
      <div className="splash-glow pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative flex flex-col items-center">
        <div className="splash-logo relative flex h-28 w-28 items-center justify-center rounded-[30px] bg-white shadow-2xl shadow-violet-500/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-full w-full rounded-[30px] object-contain p-1" />
          <span className="splash-ring absolute -inset-2.5 rounded-[36px] border-2 border-transparent border-t-cyan-300/90 border-r-violet-400/50" />
        </div>

        <h1 className="mt-6 text-xl font-bold tracking-tight text-white">OtoFlow Pro</h1>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-blue-200/70">
          by NB Projects
        </p>

        <div className="mt-7 h-1 w-44 overflow-hidden rounded-full bg-white/10">
          <div className="splash-bar h-full w-1/2 rounded-full bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-300" />
        </div>
        <p className="mt-3 text-[11px] text-blue-200/50">Menyiapkan aplikasi bengkel Anda…</p>
      </div>
    </div>
  );
}
