"use client";

import type { DocumentBlock } from "@/lib/document-parser";
import { extractDocumentMeta, parseDocumentMarkdown } from "@/lib/document-parser";

interface Props {
  markdown: string;
}

export function DocumentView({ markdown }: Props) {
  const blocks = parseDocumentMarkdown(markdown);
  const meta = extractDocumentMeta(blocks);
  const firstTitleIndex = blocks.findIndex((b) => b.type === "title");

  const bodyBlocks = blocks.filter(
    (block, index) => !(block.type === "title" && index === firstTitleIndex)
  );

  return (
    <article className="doc-report">
      <header className="doc-report-header">
        <h1 className="doc-report-title">{meta.title}</h1>
        {meta.subtitle && <p className="doc-report-subtitle">{meta.subtitle}</p>}
        <div className="doc-report-divider" />
      </header>

      <div className="doc-report-body">
        {bodyBlocks.map((block, index) => (
          <DocBlock key={index} block={block} />
        ))}
      </div>
    </article>
  );
}

function DocBlock({ block }: { block: DocumentBlock }) {
  switch (block.type) {
    case "title":
      return <h1 className="doc-section-title doc-section-title--main">{block.text}</h1>;

    case "subtitle":
      return <p className="doc-report-subtitle doc-report-subtitle--inline">{block.text}</p>;

    case "section":
      return <h2 className="doc-section-title">{block.text}</h2>;

    case "subsection":
      return <h3 className="doc-subsection-title">{block.text}</h3>;

    case "keyvalue":
      return (
        <table className="doc-kv-table">
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i}>
                <th>{row.label}</th>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case "table":
      if (
        block.headers.length === 2 &&
        block.rows.length <= 12 &&
        block.rows.every((r) => r.length === 2) &&
        !block.headers[0].toLowerCase().includes("item")
      ) {
        return (
          <table className="doc-kv-table">
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  <th>{row[0]}</th>
                  <td>{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
      return (
        <div className="doc-table-wrap">
          <table className="doc-data-table">
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "paragraph":
      return (
        <p
          className={
            block.variant === "attention" ? "doc-attention" : "doc-paragraph"
          }
        >
          {block.text}
        </p>
      );

    case "list":
      return (
        <ul className="doc-list">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );

    case "checkbox":
      return (
        <ul className="doc-checklist">
          {block.items.map((item, i) => (
            <li key={i}>
              <span className="doc-checkbox">☐</span> {item}
            </li>
          ))}
        </ul>
      );

    default:
      return null;
  }
}
