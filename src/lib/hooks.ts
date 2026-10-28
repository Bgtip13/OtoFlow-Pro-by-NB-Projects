"use client";

import { useEffect, useRef, useState } from "react";

/** Menunda nilai (mis. kata kunci pencarian) agar tidak query di setiap ketikan. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (value === debounced) return;
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);

  return debounced;
}

/** Penjaga urutan request agar hasil lama tidak menimpa hasil terbaru. */
export function useRequestGuard() {
  const idRef = useRef(0);
  return {
    next() {
      idRef.current += 1;
      return idRef.current;
    },
    isCurrent(id: number) {
      return idRef.current === id;
    },
  };
}
