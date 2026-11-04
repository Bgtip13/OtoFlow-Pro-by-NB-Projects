"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Bar progres tipis di atas layar saat berpindah halaman.
 * Memberi umpan balik instan sehingga perpindahan menu tidak terasa "patah-patah".
 */
export default function RouteProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const prevPath = useRef(pathname);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stop() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    // beri jeda singkat agar bar sempat menyelesaikan animasinya
    timeoutRef.current = setTimeout(() => setActive(false), 220);
  }

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      stop();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname]);

  useEffect(() => {
    function start() {
      setActive(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // pengaman: jangan biarkan bar menggantung jika navigasi dibatalkan
      timeoutRef.current = setTimeout(() => setActive(false), 8000);
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;

      const url = new URL(href, window.location.origin);
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      start();
    }

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="app-progress pointer-events-none fixed inset-x-0 top-0 z-[120] h-[3px]">
      {active && (
        <div className="route-progress-bar h-full bg-brand shadow-[0_0_12px_rgba(111,85,255,0.8)]" />
      )}
    </div>
  );
}
