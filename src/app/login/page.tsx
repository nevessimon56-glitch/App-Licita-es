import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { SupabaseAuthForm } from "@/components/SupabaseAuthForm";
import { isSupabaseEnabled, isRegistrationAllowed } from "@/lib/supabase/config";

/** Lê as variáveis NEXT_PUBLIC_* em tempo de execução (não só no build). */
export const dynamic = "force-dynamic";

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
      {useSupabase ? (
        <SupabaseAuthForm allowRegistration={isRegistrationAllowed()} />
      ) : (
        <LoginForm />
      )}
    </Suspense>
  );
}
