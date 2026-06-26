"use client";

import { useEffect } from "react";
import { clearChunkReloadFlag, recoverFromChunkError } from "@/lib/chunk-error";

export function ChunkLoadRecovery() {
  useEffect(() => {
    clearChunkReloadFlag();

    const handleRejection = (event: PromiseRejectionEvent) => {
      if (recoverFromChunkError(event.reason)) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  return null;
}
