"use client";

import { AuthSessionGuard } from "@/components/AuthSessionGuard";

export function AuthShell({
  authEnabled,
  children,
}: {
  authEnabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <AuthSessionGuard authEnabled={authEnabled}>{children}</AuthSessionGuard>
  );
}
