"use client";

import { Plus, Trash2 } from "lucide-react";
import type { KvTableRow } from "@/lib/markdown-sections";

interface Props {
  headers: [string, string];
  rows: KvTableRow[];
  onChange: (rows: KvTableRow[]) => void;
}

export function EditableKvTable({ headers, rows, onChange }: Props) {
  const updateRow = (index: number, patch: Partial<KvTableRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    onChange([...rows, { label: "Novo campo", value: "" }]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <table className="doc-kv-table doc-kv-table--editable">
        <thead>
          <tr>
            <th>{headers[0]}</th>
            <th>{headers[1]}</th>
            <th className="w-10" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td>
                <input
                  type="text"
                  value={row.label}
                  onChange={(event) => updateRow(index, { label: event.target.value })}
                  className="doc-edit-input"
                />
              </td>
              <td>
                <textarea
                  value={row.value}
                  onChange={(event) => updateRow(index, { value: event.target.value })}
                  rows={Math.min(4, Math.max(2, row.value.split("\n").length))}
                  className="doc-edit-textarea"
                />
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="doc-edit-remove"
                  aria-label={`Remover linha ${row.label}`}
                  title="Remover linha"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="button" onClick={addRow} className="doc-edit-add-row">
        <Plus className="w-4 h-4" />
        Adicionar linha
      </button>
    </div>
  );
}
