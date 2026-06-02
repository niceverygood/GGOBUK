'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DaewoonPeriod } from '@/lib/saju/types';
import { CREDIT_COSTS } from '@/lib/credits';
import { isNativeApp } from '@/lib/utils/platform';
import {
  completeGeneration,
  startGeneration,
} from '@/lib/utils/generation-lock';
import { AnalysisLoader } from '@/components/ui/AnalysisLoader';
import {
  PERSONA_LOADER_STEPS,
  loaderEyebrowFor,
} from '@/lib/llm/persona_loader_steps';
import { readPersonaMode } from '@/lib/utils/persona-mode';

const EXPECTED_DAEWOON_MS = 32_000;

/**
 * Defensive markdown stripper for cold-read text.
 *
 * The LLM is instructed to output plain text only, but past responses saved
 * in DB might contain ###, **, ---, leading -. We strip those at render time
 * so old content still looks clean.
 *
 * Critically: the LLM sometimes jams everything onto one line, so markdown
 * separators like `--- ### 2.` show up INLINE (not at line start). We handle
 * both inline and line-start positions, converting structural markers
 * (headings, horizontal rules) into paragraph breaks before stripping their
 * symbols so the final split-on-\n{2,} produces clean paragraphs.
 */
function stripMarkdown(raw: string): string {
  let s = raw;

  // Step 1: promote structural markers to paragraph breaks regardless of
  // whether they're at line start or inline.
  //
  // ATX headings: `# ` … `###### ` — preserve heading text, prefix newlines.
  s = s.replace(/(^|\s)#{1,6}\s+([^\n]*?)(?=\s+(?:---|#{1,6}\s|$)|$)/g,
    (_m, _pre, title) => `\n\n${title.trim()}\n\n`);
  // Catch any remaining # markers (e.g. mid-line ones we didn't catch above)
  s = s.replace(/(^|\s)#{1,6}\s+/g, '\n\n');
  // Horizontal rules: `---`, `***`, `___` (3+ in a row), either inline or
  // on their own line.
  s = s.replace(/(^|\s)[-*_]{3,}(?=\s|$)/g, '\n\n');

  // Step 2: strip remaining markdown markers (text content preserved).
  // Bold: **bold**, __bold__
  s = s.replace(/\*\*(.+?)\*\*/g, '$1');
  s = s.replace(/__(.+?)__/g, '$1');
  // Italic: *italic*, _italic_
  s = s.replace(/(?<![*\w])\*(?!\*)([^*\n]+?)(?<!\*)\*(?![*\w])/g, '$1');
  s = s.replace(/(?<![_\w])_(?!_)([^_\n]+?)(?<!_)_(?![_\w])/g, '$1');
  // Block quotes (line start)
  s = s.replace(/^>\s?/gm, '');
  // Leading bullet/numbered markers at line start
  s = s.replace(/^\s*[-*+]\s+/gm, '');
  s = s.replace(/^\s*\d+[.)]\s+/gm, '');
  // Inline backticks
  s = s.replace(/`([^`]+)`/g, '$1');

  // Step 3: normalize whitespace
  // Collapse 3+ consecutive newlines into 2 (= paragraph break)
  s = s.replace(/\n{3,}/g, '\n\n');
  // Trim trailing/leading whitespace on each line
  s = s
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');
  return s.trim();
}

export function ColdReadCard({ period }: { period: DaewoonPeriod }) {
  const [text, setText] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<
    'correct' | 'wrong' | 'partial' | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    const lockId = `coldread:${period.startYear}`;
    setLoading(true);
    setError('');
    startGeneration(
      lockId,
      `대운 AI 해설 — ${period.startYear}년~`,
      '/timeline',
    );
    let lockStatus: 'success' | 'error' = 'success';
    try {
      const res = await fetch('/api/timeline/coldread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daewoonStartYear: period.startYear }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'unknown',
        );
      }
      setText(data.text ?? null);
    } catch (e) {
      const code = e instanceof Error ? e.message : 'unknown';
      setError(
        code === 'insufficient_credits'
          ? '꼬북알이 부족해. 충전 후 다시 눌러줘.'
          : '대운 해설을 생성하지 못했어. 잠시 후 다시 시도해줘.',
      );
      lockStatus = 'error';
    } finally {
      completeGeneration(lockId, lockStatus);
      setLoading(false);
    }
  }

  async function submitFeedback(fb: 'correct' | 'wrong' | 'partial') {
    if (!text) return;
    setFeedback(fb);
    await fetch('/api/timeline/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daewoonStartYear: period.startYear,
        coldreadText: text,
        feedback: fb,
      }),
    });
  }

  return (
    <div className="rounded-3xl bg-white shadow-sm p-5 mt-4">
      <p className="text-xs font-black text-muted">꼬북도사 AI 해설</p>
      <div className="mt-1 text-xs opacity-60 mb-1">
        {period.startYear}–{period.startYear + 9} · {period.startAge}–
        {period.startAge + 9}세 · {period.pillar.ganHanja}
        {period.pillar.jiHanja} ({period.sipsung})
      </div>
      {!text && !loading && (
        <button
          onClick={generate}
          className="mt-3 w-full rounded-2xl bg-navy py-3 text-sm font-black text-white shadow-[0_12px_24px_rgba(44,62,80,0.18)]"
        >
          {CREDIT_COSTS.daewoon}꼬북알로 대운 AI 해설 보기
        </button>
      )}
      {loading && (() => {
        const p = readPersonaMode();
        return (
          <div className="mt-3">
            <AnalysisLoader
              steps={PERSONA_LOADER_STEPS[p]}
              expectedMs={EXPECTED_DAEWOON_MS}
              eyebrow={loaderEyebrowFor(p)}
            />
          </div>
        );
      })()}
      {error && (
        <div className="mt-3 rounded-2xl bg-red/10 px-4 py-3 text-sm font-bold text-red">
          {error}{' '}
          {error.includes('부족') && !isNativeApp() && (
            <Link href="/more/pro" className="underline underline-offset-4">
              충전하기
            </Link>
          )}
        </div>
      )}
      {text && (
        <div className="mt-2 space-y-3 text-[15px] leading-relaxed">
          {stripMarkdown(text)
            .split(/\n{2,}/)
            .map((para) => para.trim())
            .filter(Boolean)
            .map((para, i) => (
              <p key={i} className="whitespace-pre-wrap">
                {para}
              </p>
            ))}
        </div>
      )}
      {text && (
        <div className="mt-4 flex gap-2">
          <button
            disabled={!!feedback}
            onClick={() => submitFeedback('correct')}
            className={`flex-1 rounded-xl py-2 text-sm border ${
              feedback === 'correct'
                ? 'bg-[var(--color-shell-dark)] text-white border-[var(--color-shell-dark)]'
                : 'border-black/10'
            }`}
          >
            맞았어
          </button>
          <button
            disabled={!!feedback}
            onClick={() => submitFeedback('partial')}
            className={`flex-1 rounded-xl py-2 text-sm border ${
              feedback === 'partial'
                ? 'bg-[var(--color-gold)] text-[var(--color-ink)] border-[var(--color-gold)]'
                : 'border-black/10'
            }`}
          >
            반쯤
          </button>
          <button
            disabled={!!feedback}
            onClick={() => submitFeedback('wrong')}
            className={`flex-1 rounded-xl py-2 text-sm border ${
              feedback === 'wrong'
                ? 'bg-[#E74C3C] text-white border-[#E74C3C]'
                : 'border-black/10'
            }`}
          >
            틀렸어
          </button>
        </div>
      )}
    </div>
  );
}
