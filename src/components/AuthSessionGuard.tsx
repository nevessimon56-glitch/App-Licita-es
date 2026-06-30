"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuthSessionOnLeave, hasAuthSessionFlag } from "@/lib/site-auth";

export function AuthSessionGuard({
  authEnabled,
  children,
}: {
  authEnabled: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!authEnabled) return;

    const handleLeave = () => {
      clearAuthSessionOnLeave();
    };

    window.addEventListener("pagehide", handleLeave);
    return () => window.removeEventListener("pagehide", handleLeave);
  }, [authEnabled]);

  useEffect(() => {
    if (!authEnabled || pathname === "/login") return;

    if (!hasAuthSessionFlag()) {
      fetch("/api/auth/logout", { method: "POST" })
        .catch(() => {})
        .finally(() => {
          router.replace("/login");
        });
    }
  }, [authEnabled, pathname, router]);

  return <>{children}</>;
}
