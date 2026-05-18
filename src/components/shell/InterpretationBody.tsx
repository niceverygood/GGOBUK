// Render a long-form interpretation paragraph with .highlight underlines on hanja tokens.
// Currently: highlight any sequence of CJK characters. Future: route through a structured renderer
// that pulls actual palja tokens from the LLM response.

import React from 'react';

const HANJA_RE = /([一-鿿]+(?:\s?[가-힣]+)?)/g;

type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'conclusion'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

export function InterpretationBody({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <InterpretationBlock key={i} block={block} />
      ))}
    </div>
  );
}

function InterpretationBlock({ block }: { block: Block }) {
  if (block.type === 'heading') {
    return (
      <h2 className="pt-2 text-lg font-black leading-tight text-navy">
        {renderHighlights(block.text)}
      </h2>
    );
  }

  if (block.type === 'conclusion') {
    return (
      <div className="rounded-2xl bg-mint/15 px-4 py-3">
        <p className="text-sm font-black leading-relaxed text-navy">
          {renderHighlights(block.text)}
        </p>
      </div>
    );
  }

  if (block.type === 'quote') {
    return (
      <div className="border-l-4 border-gold bg-gold/10 px-4 py-3">
        <p className="text-[14px] font-bold leading-[1.75] text-[#4A433B]">
          {renderHighlights(block.text)}
        </p>
      </div>
    );
  }

  if (block.type === 'list') {
    return (
      <ul className="space-y-2 rounded-2xl bg-white/65 px-4 py-3">
        {block.items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-[14px] font-semibold leading-[1.65] text-[#3C4650]"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
            <span>{renderHighlights(item)}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === 'table') {
    return (
      <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left text-[12px]">
            <thead>
              <tr className="bg-navy text-white">
                {block.headers.map((header) => (
                  <th key={header} className="px-3 py-2.5 font-black">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr
                  key={`${row.join('-')}-${rowIndex}`}
                  className="border-t border-navy/10 odd:bg-ivory/45"
                >
                  {block.headers.map((_, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-3 py-2.5 align-top font-semibold leading-relaxed text-[#3C4650]"
                    >
                      {renderHighlights(row[cellIndex] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <p className="text-[14px] font-semibold leading-[1.78] text-[#3C4650]">
      {renderHighlights(block.text)}
    </p>
  );
}

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i += 1;
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      blocks.push({ type: 'heading', text: line.replace(/^#{1,3}\s+/, '') });
      i += 1;
      continue;
    }

    if (line.startsWith('|') && lines[i + 1]?.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i += 1;
      }
      const parsed = parseTable(tableLines);
      if (parsed) blocks.push(parsed);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    if (line.startsWith('>')) {
      blocks.push({ type: 'quote', text: line.replace(/^>\s?/, '') });
      i += 1;
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length) {
      const next = lines[i].trim();
      if (
        !next ||
        /^#{1,3}\s+/.test(next) ||
        /^[-*]\s+/.test(next) ||
        next.startsWith('|') ||
        next.startsWith('>')
      ) {
        break;
      }
      paragraph.push(next);
      i += 1;
    }
    const paragraphText = paragraph.join(' ');
    blocks.push({
      type: /^한\s*줄\s*결론[:：]/.test(paragraphText)
        ? 'conclusion'
        : 'paragraph',
      text: paragraphText,
    });
  }

  return blocks;
}

function parseTable(lines: string[]): Block | null {
  if (lines.length < 2) return null;
  const rows = lines
    .map((line) =>
      line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim()),
    )
    .filter((row) => row.some(Boolean));

  const headers = rows[0] ?? [];
  const bodyRows = rows
    .slice(1)
    .filter((row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell)));

  if (!headers.length || !bodyRows.length) return null;
  return { type: 'table', headers, rows: bodyRows };
}

function renderHighlights(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  HANJA_RE.lastIndex = 0;
  while ((m = HANJA_RE.exec(text)) !== null) {
    if (m.index > lastIdx) out.push(text.slice(lastIdx, m.index));
    out.push(
      <span key={key++} className="highlight">
        {m[1]}
      </span>,
    );
    lastIdx = HANJA_RE.lastIndex;
  }
  if (lastIdx < text.length) out.push(text.slice(lastIdx));
  return out;
}
