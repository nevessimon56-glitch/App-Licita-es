const CHUNK_RELOAD_KEY = "app-licitacoes-chunk-reload";

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    error.name === "ChunkLoadError" ||
    message.includes("loading chunk") ||
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("importing a module script failed")
  );
}

/** Recarrega a página uma vez quando um chunk antigo falha após deploy. */
export function recoverFromChunkError(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  if (typeof window === "undefined") return false;

  if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
    return true;
  }

  return false;
}

export function clearChunkReloadFlag(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}
