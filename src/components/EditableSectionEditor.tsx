"use client";

import { Pencil } from "lucide-react";
import {
  buildKvTableMarkdown,
  isSimpleKvTable,
  parseKvTable,
} from "@/lib/markdown-sections";
import { EditableKvTable } from "./EditableKvTable";

interface Props {
  title: string;
  body: string;
  onBodyChange: (body: string) => void;
}

export function EditableSectionEditor({ title, body, onBodyChange }: Props) {
  const useTableEditor = isSimpleKvTable(body);
  const table = useTableEditor ? parseKvTable(body) : null;

  return (
    <section className="doc-editable-section">
      <div className="doc-editable-section-header">
        <h2 className="doc-section-title">{title}</h2>
        <span className="doc-editable-badge">
          <Pencil className="w-3 h-3" />
          Editável
        </span>
      </div>

      {useTableEditor && table ? (
        <EditableKvTable
          headers={table.headers}
          rows={table.rows}
          onChange={(rows) =>
            onBodyChange(buildKvTableMarkdown(table.headers, rows))
          }
        />
      ) : (
        <textarea
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          className="doc-edit-section-textarea"
          rows={Math.min(16, Math.max(5, body.split("\n").length + 1))}
          spellCheck={false}
        />
      )}
    </section>
  );
}
