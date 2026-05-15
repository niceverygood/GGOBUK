// Render a long-form interpretation paragraph with .highlight underlines on hanja tokens.
// Currently: highlight any sequence of CJK characters. Future: route through a structured renderer
// that pulls actual palja tokens from the LLM response.

import React from 'react';

const HANJA_RE = /([一-鿿]+(?:\s?[가-힣]+)?)/g;

export function InterpretationBody({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}|\n/).filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-[14px] leading-[1.78] font-semibold text-[#3C4650]">
          {renderHighlights(p)}
        </p>
      ))}
    </div>
  );
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
