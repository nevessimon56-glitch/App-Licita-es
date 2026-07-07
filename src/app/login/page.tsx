import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { SupabaseAuthForm } from "@/components/SupabaseAuthForm";
import { isSupabaseEnabled } from "@/lib/supabase/config";

export default function LoginPage() {
  const useSupabase = isSupabaseEnabled();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-600">
          Carregando...
        </div>
      }
    >
      {useSupabase ? <SupabaseAuthForm /> : <LoginForm />}
    </Suspense>
  );
}
