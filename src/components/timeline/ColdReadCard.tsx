'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DaewoonPeriod } from '@/lib/saju/types';
import { CREDIT_COSTS } from '@/lib/credits';
import { isNativeIOS } from '@/lib/utils/platform';
import {
  lockGeneration,
  unlockGeneration,
} from '@/lib/utils/generation-lock';
import {
  AnalysisLoader,
  type AnalysisStep,
} from '@/components/ui/AnalysisLoader';

const DAEWOON_STEPS: AnalysisStep[] = [
  {
    at: 0,
    title: '대운 펼치는 중...',
    body: '선택한 10년의 천간·지지부터 다시 짚고 있어요.',
  },
  {
    at: 0.16,
    title: '내 사주와 비교하는 중...',
    body: '일간·격국·용신과 어떻게 만나는지 보고 있어요.',
  },
  {
    at: 0.34,
    title: '십성 흐름 잇는 중...',
    body: '돈·관계·일·자존감 중 무엇이 강해지는지 확인 중.',
  },
  {
    at: 0.52,
    title: '신살·합충 점검 중...',
    body: '체감이 큰 사건성 단서를 조심스럽게 추리고 있어요.',
  },
  {
    at: 0.7,
    title: '세운 연결하는 중...',
    body: '올해와 다음 해까지 이어지는 결을 맞춰보는 중.',
  },
  {
    at: 0.86,
    title: '리포트 다듬는 중...',
    body: '반복되는 사건·기회·조심할 점을 읽기 좋게 정리 중.',
  },
  {
    at: 0.95,
    title: '거의 다 됐어요...',
    body: '응답을 받는 대로 바로 카드에 꽂아둘게요.',
  },
];

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
    lockGeneration(lockId);
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
    } finally {
      unlockGeneration(lockId);
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
      {loading && (
        <div className="mt-3">
          <AnalysisLoader
            steps={DAEWOON_STEPS}
            expectedMs={EXPECTED_DAEWOON_MS}
            eyebrow="대운 AI 해설 생성 중"
          />
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-2xl bg-red/10 px-4 py-3 text-sm font-bold text-red">
          {error}{' '}
          {error.includes('부족') && !isNativeIOS() && (
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
