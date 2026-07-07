"use client";

import { AuthSessionGuard } from "@/components/AuthSessionGuard";
import { isSupabaseEnabled } from "@/lib/supabase/config";

export function AuthShell({
  authEnabled,
  children,
}: {
  authEnabled: boolean;
  children: React.ReactNode;
}) {
  const useSitePasswordGuard = authEnabled && !isSupabaseEnabled();

  if (!useSitePasswordGuard) {
    return <>{children}</>;
  }

  return (
    <AuthSessionGuard authEnabled={authEnabled}>{children}</AuthSessionGuard>
  );
}
