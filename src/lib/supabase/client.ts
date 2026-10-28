import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Satu instance Supabase untuk seluruh aplikasi.
 * Sebelumnya setiap komponen membuat client baru di setiap render,
 * yang membuat auth listener & koneksi ikut dibuat ulang (aplikasi terasa lambat).
 */
export function createClient(): SupabaseClient {
  if (!cached) {
    cached = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return cached;
}
