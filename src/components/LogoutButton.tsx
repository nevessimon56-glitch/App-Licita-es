"use client";

import { useRouter } from "next/navigation";
import { clearAuthSessionFlag } from "@/lib/site-auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { useState } from "react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      if (isSupabaseEnabled()) {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
      } else {
        clearAuthSessionFlag();
        await fetch("/api/auth/logout", { method: "POST" });
      }
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50 transition-colors"
      title="Sair do sistema"
    >
      <LogOut className="w-4 h-4" />
      Sair
    </button>
  );
}
