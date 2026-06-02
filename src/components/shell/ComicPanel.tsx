'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Download, ImageIcon, PanelsTopLeft, Sparkles } from 'lucide-react';
import { CREDIT_COSTS } from '@/lib/credits';
import { isNativeApp } from '@/lib/utils/platform';
import { readPersonaMode } from '@/lib/utils/persona-mode';
import { ButtonPrimary } from '@/components/ui/primitives';
import type { InterpretationCategory } from '@/types/db';

const COMIC_STEPS = [
  '꼬북이가 4컷 콘티를 잡는 중...',
  '오행 색감으로 장면을 나누는 중...',
  '사주판과 현실 장면을 연결하는 중...',
  '꼬북이 표정을 맞추는 중...',
  '세로 웹툰 이미지로 마감하는 중...',
];

function comicErrorMessage(code: string) {
  if (code === 'unauthorized') return '로그인이 필요해요.';
  if (code === 'no profile') return '내 사주가 먼저 필요해요.';
  if (code === 'insufficient_credits') return '꼬북알이 부족해요.';
  if (code === 'openai_not_configured')
    return 'OpenAI 이미지 키가 아직 연결되지 않았어요. Vercel에 OPENAI_API_KEY를 넣고 재배포해줘.';
  if (code === 'openai_image_empty')
    return '이미지가 비어 왔어요. 꼬북알은 돌려뒀으니 다시 시도해줘.';
  if (code === 'rate_limited')
    return '요청이 너무 빨라요. 잠시 뒤에 다시 눌러줘.';
  return '웹툰 이미지를 만들지 못했어요. 꼬북알은 돌려뒀으니 잠시 후 다시 시도해줘.';
}

function safeFileName(title: string) {
  return `${title || '꼬북점-사주웹툰'}`
    .replace(/[^\w가-힣-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function ComicPanel({
  category,
  content,
}: {
  category: InterpretationCategory;
  content: string;
}) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [title, setTitle] = useState('꼬북점 사주 웹툰');
  const [model, setModel] = useState('');
  const [format, setFormat] = useState('png');
  const [cached, setCached] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading) return;

    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % COMIC_STEPS.length);
    }, 1700);

    return () => window.clearInterval(timer);
  }, [loading]);

  async function generate() {
    setLoading(true);
    setStep(0);
    setError('');
    try {
      const res = await fetch('/api/comics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          content,
          persona: readPersonaMode(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          typeof data.error === 'string' ? data.error : 'unknown',
        );

      setImageDataUrl(
        typeof data.imageDataUrl === 'string' ? data.imageDataUrl : '',
      );
      setTitle(typeof data.title === 'string' ? data.title : '꼬북점 사주 웹툰');
      setModel(typeof data.model === 'string' ? data.model : '');
      setFormat(typeof data.format === 'string' ? data.format : 'png');
      setCached(Boolean(data.cached));
    } catch (e) {
      setError(comicErrorMessage(e instanceof Error ? e.message : 'unknown'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-mint/35 bg-gradient-to-br from-mint/16 via-white to-gold/16 shadow-[0_12px_28px_rgba(44,62,80,0.08)]">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-navy text-white">
            <PanelsTopLeft size={21} strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-navy">꼬북 웹툰으로 보기</p>
            <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
              지금 풀이를 꼬북이가 4컷 세로 웹툰 이미지로 다시 그려줘.
            </p>
          </div>
          {cached && (
            <span className="shrink-0 rounded-full bg-mint/20 px-2.5 py-1 text-[10px] font-black text-navy">
              보관됨
            </span>
          )}
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
          <div className="mt-4 grid aspect-[2/3] place-items-center rounded-3xl border border-dashed border-navy/15 bg-white/65 px-5 text-center">
            <div>
              <ImageIcon
                size={34}
                strokeWidth={2.2}
                className="mx-auto text-muted"
              />
              <p className="mt-3 text-sm font-black text-navy">
                아직 만든 웹툰이 없어
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
              <Sparkles size={16} className="animate-pulse text-mint-dark" />
              {COMIC_STEPS[step]}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy/10">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-mint via-mint-dark to-gold" />
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-2">
          <ButtonPrimary tone="mint" onClick={generate} disabled={loading}>
            {loading
              ? '웹툰 그리는 중...'
              : `${CREDIT_COSTS.comic}꼬북알로 웹툰 만들기`}
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
            {error.includes('꼬북알') && !isNativeApp() && (
              <Link href="/more/pro" className="underline underline-offset-4">
                충전하기
              </Link>
            )}
          </p>
        )}

        <p className="mt-3 text-center text-[10px] font-bold leading-relaxed text-muted">
          웹툰 이미지는 자기이해와 재미를 위한 콘텐츠이며, 실제 결과를
          보장하지는 않아요.
        </p>
      </div>
    </div>
  );
}
