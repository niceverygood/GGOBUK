'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import {
  PREMIUM_SERVICES,
  type PremiumService,
  type PremiumServiceId,
} from '@/lib/premium-services';
import { CREDIT_UNIT } from '@/lib/credits';
import { InterpretationBody } from '@/components/shell/InterpretationBody';
import { Badge, Card } from '@/components/ui/primitives';

interface PremiumServiceResult {
  serviceId: PremiumServiceId;
  title: string;
  content: string;
  model?: string;
  generatedAt: string;
}

const STORAGE_KEY = 'ggobuk_premium_service_results_v1';

function errorMessage(code: string): string {
  if (code === 'unauthorized') return '로그인이 필요해요.';
  if (code === 'no profile') return '내 사주가 먼저 필요해요.';
  if (code === 'insufficient_credits') return `${CREDIT_UNIT}이 부족해요.`;
  if (code === 'topic_required') return '고민 내용을 짧게 적어줘.';
  if (code === 'llm_not_configured') return 'AI 키 설정이 아직 안 되어 있어요.';
  return '리포트를 만들지 못했어요. 사용한 꼬북알은 돌려뒀으니 다시 시도해줘.';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PremiumServiceStore() {
  const [loadingId, setLoadingId] = useState<PremiumServiceId | null>(null);
  const [topicById, setTopicById] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [results, setResults] = useState<PremiumServiceResult[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as PremiumServiceResult[];
      return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
    } catch {
      return [];
    }
  });
  const latest = results[0] ?? null;

  useEffect(() => {
    if (results.length === 0) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(results.slice(0, 6)),
    );
  }, [results]);

  const featured = useMemo(
    () => PREMIUM_SERVICES.filter((service) => service.badge === '인기'),
    [],
  );

  async function generate(service: PremiumService) {
    const topic = topicById[service.id]?.trim();
    setError('');
    if (service.requiresTopic && !topic) {
      setError(errorMessage('topic_required'));
      return;
    }

    setLoadingId(service.id);
    try {
      const res = await fetch('/api/premium-services/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: service.id, topic }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          typeof data.error === 'string' ? data.error : 'generation_failed',
        );

      const next: PremiumServiceResult = {
        serviceId: service.id,
        title: typeof data.title === 'string' ? data.title : service.title,
        content: typeof data.content === 'string' ? data.content : '',
        model: typeof data.model === 'string' ? data.model : undefined,
        generatedAt:
          typeof data.generatedAt === 'string'
            ? data.generatedAt
            : new Date().toISOString(),
      };
      setResults((current) => [next, ...current].slice(0, 6));
    } catch (e) {
      setError(errorMessage(e instanceof Error ? e.message : 'unknown'));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-2xl bg-gold/30 text-navy">
            <Sparkles size={18} strokeWidth={2.5} />
          </span>
          <p className="text-sm font-black text-navy">
            새로 열 수 있는 운세 상품
          </p>
          <Badge tone="red" className="px-2 py-1">
            유료
          </Badge>
        </div>
        <Link href="/store" className="text-xs font-black text-mint-dark">
          꼬북상점
        </Link>
      </div>

      {featured.length > 0 && (
        <div className="mb-3 rounded-3xl border border-gold/40 bg-gold/18 px-4 py-3">
          <p className="text-xs font-black text-[#6B5A24]">
            지금 가장 결제 전환이 좋은 상품
          </p>
          <p className="mt-1 text-sm font-black text-navy">
            {featured.map((service) => service.title).join(' · ')}
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {PREMIUM_SERVICES.map((service) => (
          <Card key={service.id} className="overflow-hidden p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ivory text-xl">
                {service.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-navy">
                      {service.title}
                    </p>
                    <p className="mt-0.5 text-xs font-bold leading-relaxed text-muted">
                      {service.subtitle}
                    </p>
                  </div>
                  <Badge tone={service.badge === '인기' ? 'red' : 'gold'}>
                    {service.badge}
                  </Badge>
                </div>

                {service.requiresTopic && (
                  <input
                    value={topicById[service.id] ?? ''}
                    onChange={(event) =>
                      setTopicById((current) => ({
                        ...current,
                        [service.id]: event.target.value,
                      }))
                    }
                    placeholder={service.placeholder}
                    className="mt-3 h-11 w-full rounded-2xl border border-navy/10 bg-ivory px-3 text-xs font-bold text-navy outline-none ring-mint/40 placeholder:text-muted/70 focus:ring-2"
                  />
                )}

                <button
                  type="button"
                  onClick={() => generate(service)}
                  disabled={!!loadingId}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-navy text-sm font-black text-white shadow-[0_12px_24px_rgba(44,62,80,0.18)] disabled:opacity-60"
                >
                  {loadingId === service.id ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      리포트 여는 중...
                    </>
                  ) : (
                    <>
                      {service.cost}
                      {CREDIT_UNIT}로 열기
                      <ArrowRight size={16} strokeWidth={3} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-2xl bg-red/10 px-4 py-3 text-center text-xs font-bold leading-relaxed text-red">
          {error}{' '}
          {error.includes(CREDIT_UNIT) && (
            <Link href="/store" className="underline underline-offset-4">
              충전하기
            </Link>
          )}
        </p>
      )}

      {latest && (
        <Card className="mt-4 p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-muted">
                방금 열린 프리미엄 리포트 · {formatDate(latest.generatedAt)}
              </p>
              <h2 className="mt-1 text-xl font-black text-navy">
                {latest.title}
              </h2>
            </div>
            <Badge tone="mint">완료</Badge>
          </div>
          <InterpretationBody text={latest.content} />
          {latest.model && (
            <p className="mt-4 text-center text-[10px] font-bold text-muted">
              생성 모델: {latest.model}
            </p>
          )}
        </Card>
      )}
    </section>
  );
}
