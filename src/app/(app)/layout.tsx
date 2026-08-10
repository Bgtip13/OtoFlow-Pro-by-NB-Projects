import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Shell from "@/components/shell";
import { ToastProvider } from "@/components/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("username, role").eq("id", user.id).maybeSingle(),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const isAdmin = profile?.role === "admin";
  const company = settings?.company_name || "OtoFlow Pro";
  const logoUrl = settings?.logo_url || "/logo.png";

  return (
    <ToastProvider>
      <Shell
        company={company}
        logoUrl={logoUrl}
        username={profile?.username ?? "User"}
        isAdmin={isAdmin}
      >
        {children}
      </Shell>
    </ToastProvider>
  );
}
