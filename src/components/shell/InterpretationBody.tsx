"use client";

// Render a long-form interpretation as topic rows with expandable content.
// Hanja tokens are highlighted inline so the result still feels tied to the shell data.

import React, { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  ChevronDown,
  CircleDollarSign,
  CircleDot,
  Compass,
  Heart,
  Home,
  ScrollText,
  ShieldAlert,
  Smile,
  Sparkles,
  Swords,
  Table2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const HANJA_RE = /([一-鿿]+(?:\s?[가-힣]+)?)/g;

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "conclusion"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };

type TopicSection = {
  title: string;
  blocks: Block[];
};

type TopicMeta = {
  icon: LucideIcon;
  iconClass: string;
  iconBgClass: string;
};

export function InterpretationBody({ text }: { text: string }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  const { intro, sections } = useMemo(() => groupTopicSections(blocks), [blocks]);
  const defaultOpenIndex = intro.length > 0 ? null : sections.length > 0 ? 0 : null;
  const [openState, setOpenState] = useState<{
    text: string;
    index: number | null;
  }>(() => ({ text, index: defaultOpenIndex }));
  const openIndex =
    openState.text === text ? openState.index : defaultOpenIndex;

  if (sections.length > 0) {
    return (
      <div className="space-y-4">
        {intro.length > 0 && (
          <div className="rounded-2xl bg-ivory/70 px-4 py-3">
            <div className="space-y-4">
              {intro.map((block, i) => (
                <InterpretationBlock key={i} block={block} />
              ))}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-[1.65rem] border border-navy/10 bg-white/78 shadow-[0_10px_24px_rgba(44,62,80,0.05)]">
          {sections.map((section, index) => {
            const open = openIndex === index;
            const meta = topicMeta(section.title, index);
            const Icon = meta.icon;
            const panelId = `interpretation-topic-${index}`;

            return (
              <section
                key={`${section.title}-${index}`}
                className="border-b border-navy/10 last:border-b-0"
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() =>
                    setOpenState({ text, index: open ? null : index })
                  }
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-mint/8 active:bg-mint/12"
                >
                  <span
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-navy/5",
                      meta.iconBgClass,
                      meta.iconClass,
                    )}
                  >
                    <Icon size={21} strokeWidth={2.6} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[18px] font-black leading-snug text-navy underline decoration-navy/25 underline-offset-4">
                      {section.title}
                    </span>
                  </span>
                  <ChevronDown
                    size={20}
                    strokeWidth={2.8}
                    className={cn(
                      "shrink-0 text-muted transition-transform duration-200",
                      open && "rotate-180 text-navy",
                    )}
                  />
                </button>

                {open && (
                  <div
                    id={panelId}
                    className="border-t border-navy/10 bg-ivory/45 px-4 py-4"
                  >
                    <div className="space-y-4">
                      {section.blocks.map((block, blockIndex) => (
                        <InterpretationBlock
                          key={`${section.title}-${blockIndex}`}
                          block={block}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <InterpretationBlock key={i} block={block} />
      ))}
    </div>
  );
}

function groupTopicSections(blocks: Block[]): {
  intro: Block[];
  sections: TopicSection[];
} {
  const intro: Block[] = [];
  const sections: TopicSection[] = [];
  let current: TopicSection | null = null;

  for (const block of blocks) {
    if (block.type === "heading") {
      if (current && current.blocks.length > 0) sections.push(current);
      current = { title: block.text, blocks: [] };
      continue;
    }

    if (current) {
      current.blocks.push(block);
    } else {
      intro.push(block);
    }
  }

  if (current && current.blocks.length > 0) sections.push(current);
  if (sections.length > 0) return { intro, sections };

  const sectionable = blocks.filter((block) => block.type !== "heading");
  if (sectionable.length < 2) return { intro: [], sections: [] };

  return {
    intro: [],
    sections: sectionable.map((block, index) => ({
      title: titleFromBlock(block, index),
      blocks: [block],
    })),
  };
}

function titleFromBlock(block: Block, index: number): string {
  if (block.type === "conclusion") return "한 줄 결론";
  if (block.type === "list") return index === 0 ? "체감 체크포인트" : "실전 체크리스트";
  if (block.type === "quote") return "핵심 문장";
  if (block.type === "table") {
    return block.headers.some((header) => header.includes("근거"))
      ? "판독 근거 표"
      : "상황별 정리";
  }
  if (block.type === "heading") return block.text;

  const cleaned = block.text
    .replace(/^한\s*줄\s*결론[:：]\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const firstSentence =
    cleaned.split(/[.!?。！？]/).find((part) => part.trim().length > 0) ?? cleaned;
  return compactTitle(firstSentence, index);
}

function compactTitle(value: string, index: number): string {
  const cleaned = value.trim();
  if (!cleaned) return `주제 ${index + 1}`;
  if (cleaned.length <= 28) return cleaned;

  const words = cleaned.split(" ");
  let out = "";
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > 28) break;
    out = next;
  }

  return out || `${cleaned.slice(0, 26)}...`;
}

function topicMeta(title: string, index: number): TopicMeta {
  const rules: Array<{
    test: RegExp;
    icon: LucideIcon;
    iconClass: string;
    iconBgClass: string;
  }> = [
    {
      test: /주의|경계|약점|위험|조심|방어|갈등/,
      icon: ShieldAlert,
      iconClass: "text-red",
      iconBgClass: "bg-red/12",
    },
    {
      test: /사랑|연애|결혼|궁합|인연/,
      icon: Heart,
      iconClass: "text-red",
      iconBgClass: "bg-red/10",
    },
    {
      test: /돈|재물|수익|월급|투자|재성/,
      icon: CircleDollarSign,
      iconClass: "text-[#B58A00]",
      iconBgClass: "bg-gold/24",
    },
    {
      test: /직업|일|커리어|전문|성과|이직|창업/,
      icon: Briefcase,
      iconClass: "text-navy",
      iconBgClass: "bg-navy/8",
    },
    {
      test: /강점|장점|무기|빛|활용|처방/,
      icon: Sparkles,
      iconClass: "text-mint-dark",
      iconBgClass: "bg-mint/16",
    },
    {
      test: /성격|감정|마음|내면|카리스마|진심/,
      icon: Smile,
      iconClass: "text-red",
      iconBgClass: "bg-red/10",
    },
    {
      test: /가족|부모|집안/,
      icon: Home,
      iconClass: "text-[#B58A00]",
      iconBgClass: "bg-gold/20",
    },
    {
      test: /친구|관계|대인|사람|동료/,
      icon: Users,
      iconClass: "text-mint-dark",
      iconBgClass: "bg-mint/16",
    },
    {
      test: /방향|개운|루틴|환경|공간/,
      icon: Compass,
      iconClass: "text-mint-dark",
      iconBgClass: "bg-mint/16",
    },
    {
      test: /표|근거|원국|오행|십성|일주|격국|용신/,
      icon: Table2,
      iconClass: "text-navy",
      iconBgClass: "bg-ivory",
    },
    {
      test: /결론|총평|핵심|흐름/,
      icon: ScrollText,
      iconClass: "text-navy",
      iconBgClass: "bg-mint/14",
    },
  ];

  const match = rules.find((rule) => rule.test.test(title));
  if (match) return match;

  const fallbacks: TopicMeta[] = [
    { icon: Swords, iconClass: "text-red", iconBgClass: "bg-red/10" },
    { icon: Heart, iconClass: "text-red", iconBgClass: "bg-red/10" },
    { icon: Smile, iconClass: "text-mint-dark", iconBgClass: "bg-mint/16" },
    { icon: Briefcase, iconClass: "text-navy", iconBgClass: "bg-navy/8" },
    { icon: CircleDot, iconClass: "text-[#B58A00]", iconBgClass: "bg-gold/20" },
  ];
  return fallbacks[index % fallbacks.length];
}

function InterpretationBlock({ block }: { block: Block }) {
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
    // Mobile-first: render each row as a stacked card. The first column
    // (typically "사주 근거" or "상황") becomes the card title; remaining
    // columns become labeled key-value rows. This avoids horizontal scrolling
    // entirely on phone widths where a 3-col table can't fit.
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
