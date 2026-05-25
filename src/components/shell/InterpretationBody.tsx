// Render a long-form interpretation paragraph with .highlight underlines on hanja tokens.
// Flat block rendering — headings, paragraphs, conclusion, lists, quotes, tables — in document order.
// Special-case: "## 한눈에" + following bullet list = TLDR callout card with 키워드/실천/조심.

import React from "react";

const HANJA_RE = /([一-鿿]+(?:\s?[가-힣]+)?)/g;

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "conclusion"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "tldr"; keyword?: string; doThis?: string; watch?: string };

export function InterpretationBody({ text }: { text: string }) {
  const raw = parseBlocks(text);
  // 한눈에 헤딩 다음 list 블록을 TLDR로 합쳐서 special card로 변환.
  const blocks = collapseTldr(raw);
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <InterpretationBlock key={i} block={block} />
      ))}
    </div>
  );
}

// "## 한눈에" 헤딩 + 다음 list를 TLDR 블록으로 묶음.
function collapseTldr(blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    if (
      b.type === "heading" &&
      /^한\s*눈에$/.test(b.text.trim()) &&
      i + 1 < blocks.length &&
      blocks[i + 1].type === "list"
    ) {
      const list = blocks[i + 1] as { type: "list"; items: string[] };
      const tldr: Extract<Block, { type: "tldr" }> = { type: "tldr" };
      for (const item of list.items) {
        // 시작 마커로 라우팅
        if (/^(🔑|키워드[:：])/.test(item)) {
          tldr.keyword = item.replace(/^🔑\s*/, '').replace(/^키워드[:：]\s*/, '').trim();
        } else if (/^(✅|이렇게\s*해봐|이렇게\s*해보시면)/.test(item)) {
          tldr.doThis = item.replace(/^✅\s*/, '').replace(/^이렇게\s*해봐[:：]?\s*/, '').replace(/^이렇게\s*해보시면[:：]?\s*/, '').trim();
        } else if (/^(⚠️|이건\s*조심|조심할\s*점)/.test(item)) {
          tldr.watch = item.replace(/^⚠️\s*/, '').replace(/^이건\s*조심[:：]?\s*/, '').replace(/^조심할\s*점[:：]?\s*/, '').trim();
        }
      }
      out.push(tldr);
      i += 1; // skip the list block
      continue;
    }
    out.push(b);
  }
  return out;
}

function InterpretationBlock({ block }: { block: Block }) {
  if (block.type === "tldr") {
    return (
      <div className="rounded-3xl border border-mint/35 bg-gradient-to-br from-mint/12 via-white to-gold/10 p-4 shadow-[0_8px_18px_rgba(44,62,80,0.06)]">
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-navy text-white px-2 py-0.5 text-[10px] font-black">
            한눈에
          </span>
          <span className="text-[11px] font-extrabold text-muted">
            본문 안 읽어도 핵심만
          </span>
        </div>
        <div className="mt-3 space-y-2.5">
          {block.keyword && (
            <div className="flex items-start gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-navy/8 text-base">
                🔑
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold text-mint-dark">
                  핵심 키워드
                </p>
                <p className="mt-0.5 text-[14px] font-black leading-snug text-navy">
                  {renderHighlights(block.keyword)}
                </p>
              </div>
            </div>
          )}
          {block.doThis && (
            <div className="flex items-start gap-2 rounded-2xl bg-mint/12 p-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-mint/30 text-base">
                ✅
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold text-mint-dark">
                  이렇게 해봐
                </p>
                <p className="mt-0.5 text-[14px] font-bold leading-snug text-navy">
                  {renderHighlights(block.doThis)}
                </p>
              </div>
            </div>
          )}
          {block.watch && (
            <div className="flex items-start gap-2 rounded-2xl bg-red/10 p-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-red/20 text-base">
                ⚠️
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold text-red">
                  이건 조심
                </p>
                <p className="mt-0.5 text-[14px] font-bold leading-snug text-navy">
                  {renderHighlights(block.watch)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (block.type === "heading") {
    return (
      <h2 className="pt-2 text-lg font-black leading-tight text-navy">
        {renderHighlights(block.text)}
      </h2>
    );
  }

  if (block.type === "conclusion") {
    return (
      <div className="rounded-2xl bg-mint/15 px-4 py-3">
        <p className="text-[16px] font-black leading-relaxed text-navy">
          {renderHighlights(block.text)}
        </p>
      </div>
    );
  }

  if (block.type === "quote") {
    return (
      <div className="border-l-4 border-gold bg-gold/10 px-4 py-3">
        <p className="text-[15.5px] font-bold leading-[1.75] text-[#4A433B]">
          {renderHighlights(block.text)}
        </p>
      </div>
    );
  }

  if (block.type === "list") {
    return (
      <ul className="space-y-2 rounded-2xl bg-white/65 px-4 py-3">
        {block.items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-[15px] font-semibold leading-[1.7] text-[#3C4650]"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
            <span>{renderHighlights(item)}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "table") {
    // Mobile-first: render each row as a stacked card so no horizontal scroll.
    const [titleHeader, ...detailHeaders] = block.headers;
    return (
      <div className="space-y-2">
        {block.rows.map((row, rowIndex) => {
          const [titleCell, ...detailCells] = row;
          return (
            <div
              key={`${row.join("-")}-${rowIndex}`}
              className="rounded-2xl border border-navy/10 bg-white/85 p-3 shadow-[0_6px_14px_rgba(44,62,80,0.04)]"
            >
              {titleHeader && (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex shrink-0 rounded-full bg-navy px-2 py-0.5 text-[11px] font-black text-white">
                    {titleHeader}
                  </span>
                  <p className="text-[14.5px] font-black leading-snug text-navy">
                    {renderHighlights(titleCell ?? "")}
                  </p>
                </div>
              )}
              {detailHeaders.length > 0 && (
                <dl className="mt-2 space-y-1.5">
                  {detailHeaders.map((header, idx) => (
                    <div
                      key={header + idx}
                      className="grid grid-cols-[72px_1fr] gap-2 items-start"
                    >
                      <dt className="text-[11px] font-extrabold uppercase tracking-wide text-mint-dark pt-0.5">
                        {header}
                      </dt>
                      <dd className="text-[14px] font-semibold leading-snug text-[#3C4650]">
                        {renderHighlights(detailCells[idx] ?? "")}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <p className="text-[15.5px] font-semibold leading-[1.8] text-[#3C4650]">
      {renderHighlights(block.text)}
    </p>
  );
}

function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || isThematicBreak(line)) {
      i += 1;
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      blocks.push({ type: "heading", text: line.replace(/^#{1,3}\s+/, "") });
      i += 1;
      continue;
    }

    if (line.startsWith("|") && lines[i + 1]?.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
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
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (line.startsWith(">")) {
      blocks.push({ type: "quote", text: line.replace(/^>\s?/, "") });
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
        isThematicBreak(next) ||
        next.startsWith("|") ||
        next.startsWith(">")
      ) {
        break;
      }
      paragraph.push(next);
      i += 1;
    }
    const paragraphText = paragraph.join(" ");
    blocks.push({
      type: /^한\s*줄\s*결론[:：]/.test(paragraphText)
        ? "conclusion"
        : "paragraph",
      text: paragraphText,
    });
  }

  return blocks;
}

function isThematicBreak(line: string): boolean {
  return /^([-*_])(?:\s*\1){2,}$/.test(line.trim());
}

function parseTable(lines: string[]): Block | null {
  if (lines.length < 2) return null;
  const rows = lines
    .map((line) =>
      line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    )
    .filter((row) => row.some(Boolean));

  const headers = rows[0] ?? [];
  const bodyRows = rows
    .slice(1)
    .filter((row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell)));

  if (!headers.length || !bodyRows.length) return null;
  return { type: "table", headers, rows: bodyRows };
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
