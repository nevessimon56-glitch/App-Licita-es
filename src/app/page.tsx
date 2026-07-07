import { AnalyzerApp } from "@/components/AnalyzerApp";
import { isAuthEnabled } from "@/lib/site-auth";
import { isSupabaseEnabled } from "@/lib/supabase/config";

export default function Home() {
  return <AnalyzerApp showLogout={isAuthEnabled() || isSupabaseEnabled()} />;
}
