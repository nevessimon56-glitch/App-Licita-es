import { createHash } from "crypto";

export function hashDocumentBuffers(
  files: { name: string; buffer: Buffer }[],
  mode: string
): string {
  const parts = files
    .map((file) => {
      const digest = createHash("sha256").update(file.buffer).digest("hex");
      return `${file.name}:${file.buffer.length}:${digest}`;
    })
    .sort();

  return createHash("sha256")
    .update(`${parts.join("|")}|mode:${mode}`)
    .digest("hex");
}
