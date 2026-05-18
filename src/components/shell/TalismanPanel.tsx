'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Download, ImageIcon, Sparkles, WandSparkles } from 'lucide-react';
import { CREDIT_COSTS } from '@/lib/credits';
import { ButtonPrimary } from '@/components/ui/primitives';
import type { InterpretationCategory } from '@/types/db';

const TALISMAN_STEPS = [
  '원국 기운 색 고르는 중...',
  '등껍질 문양을 부적 도장으로 바꾸는 중...',
  '부족한 오행을 보완색으로 채우는 중...',
  '한지 질감과 금빛 먼지를 얹는 중...',
  '휴대폰 배경으로 예쁘게 다듬는 중...',
];

function talismanErrorMessage(code: string) {
  if (code === 'unauthorized') return '로그인이 필요해요.';
  if (code === 'no profile') return '내 사주가 먼저 필요해요.';
  if (code === 'insufficient_credits') return '크래딧이 부족해요.';
  if (code === 'openai_not_configured')
    return 'OpenAI 이미지 키가 아직 연결되지 않았어요. Vercel에 OPENAI_API_KEY를 넣고 재배포해줘.';
  if (code === 'openai_image_empty')
    return '이미지가 비어 왔어요. 크래딧은 돌려뒀으니 다시 시도해줘.';
  return '부적 이미지를 만들지 못했어요. 크래딧은 돌려뒀으니 잠시 후 다시 시도해줘.';
}

function safeFileName(title: string) {
  return `${title || '꼬북점-마음부적'}`
    .replace(/[^\w가-힣-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function TalismanPanel({
  category,
}: {
  category: InterpretationCategory;
}) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [title, setTitle] = useState('꼬북점 마음부적');
  const [model, setModel] = useState('');
  const [format, setFormat] = useState('png');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading) return;

    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % TALISMAN_STEPS.length);
    }, 1600);

    return () => window.clearInterval(timer);
  }, [loading]);

  async function generate() {
    setLoading(true);
    setStep(0);
    setError('');
    try {
      const res = await fetch('/api/talismans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          typeof data.error === 'string' ? data.error : 'unknown',
        );
      setImageDataUrl(
        typeof data.imageDataUrl === 'string' ? data.imageDataUrl : '',
      );
      setTitle(typeof data.title === 'string' ? data.title : '꼬북점 마음부적');
      setModel(typeof data.model === 'string' ? data.model : '');
      setFormat(typeof data.format === 'string' ? data.format : 'png');
    } catch (e) {
      setError(
        talismanErrorMessage(e instanceof Error ? e.message : 'unknown'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/18 via-white to-mint/18 shadow-[0_12px_28px_rgba(44,62,80,0.08)]">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold text-[#3F3420]">
            <WandSparkles size={21} strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-navy">나만의 부적 받기</p>
            <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
              내 사주 기운과 지금 리포트 주제를 바탕으로 저장 가능한 마음부적
              이미지를 만들어줘.
            </p>
          </div>
        </div>

        {imageDataUrl ? (
          <div className="mt-4 overflow-hidden rounded-3xl border border-navy/10 bg-white p-2">
            <Image
              src={imageDataUrl}
              alt={title}
              width={1024}
              height={1536}
              unoptimized
              className="h-auto w-full rounded-2xl"
            />
          </div>
        ) : (
          <div className="mt-4 grid aspect-[2/3] place-items-center rounded-3xl border border-dashed border-navy/15 bg-white/60 px-5 text-center">
            <div>
              <ImageIcon
                size={34}
                strokeWidth={2.2}
                className="mx-auto text-muted"
              />
              <p className="mt-3 text-sm font-black text-navy">
                아직 만든 부적이 없어
              </p>
              <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
                생성하면 이 자리에 바로 표시되고 이미지로 저장할 수 있어.
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-3 rounded-2xl bg-white/75 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-black text-navy">
              <Sparkles size={16} className="animate-pulse text-gold-dark" />
              {TALISMAN_STEPS[step]}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy/10">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-gold to-mint" />
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-2">
          <ButtonPrimary tone="gold" onClick={generate} disabled={loading}>
            {loading
              ? '부적 그리는 중...'
              : `크래딧 ${CREDIT_COSTS.talisman}개로 부적 받기`}
          </ButtonPrimary>

          {imageDataUrl && (
            <a
              href={imageDataUrl}
              download={`${safeFileName(title)}.${format}`}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-navy text-sm font-black text-white"
            >
              <Download size={17} strokeWidth={2.6} />
              이미지로 저장하기
            </a>
          )}
        </div>

        {model && (
          <p className="mt-3 text-center text-[10px] font-bold text-muted">
            생성 모델: {model}
          </p>
        )}

        {error && (
          <p className="mt-3 text-center text-xs font-bold leading-relaxed text-red">
            {error}{' '}
            {error.includes('크래딧') && (
              <Link href="/more/pro" className="underline underline-offset-4">
                충전하기
              </Link>
            )}
          </p>
        )}

        <p className="mt-3 text-center text-[10px] font-bold leading-relaxed text-muted">
          부적 이미지는 자기성찰과 재미를 위한 콘텐츠이며, 실제 결과를
          보장하지는 않아요.
        </p>
      </div>
    </div>
  );
}
