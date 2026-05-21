'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { KkobukSprite } from '@/components/kkobuk/KkobukSprite';
import { Badge, Card, Toggle, ButtonPrimary } from '@/components/ui/primitives';

type Stage = 'loading' | 'expired' | 'done' | 'form' | 'result';

interface Result {
  hostName: string;
  guestName: string;
  score: number;
  headline: string | null;
  summary: string;
  highlights: string[];
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [stage, setStage] = useState<Stage>('loading');
  const [hostName, setHostName] = useState('꼬북이 친구');
  const [result, setResult] = useState<Result | null>(null);

  // form
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [isLunar, setIsLunar] = useState(false);
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/relations/invite/${token}`)
      .then(async (r) => {
        if (r.status === 410) return setStage('expired');
        if (!r.ok) return setStage('expired');
        const d = await r.json();
        setHostName(d.hostName ?? '꼬북이 친구');
        setStage(d.status === 'completed' ? 'done' : 'form');
      })
      .catch(() => setStage('expired'));
  }, [token]);

  async function submit() {
    setErr(null);
    if (!name.trim() || !birthDate) return setErr('이름과 생년월일은 필수예요');
    if (!timeUnknown && !birthTime) return setErr('태어난 시간을 넣거나 "시간 모름"을 선택해주세요');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/relations/invite/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          birthDate,
          birthTime: timeUnknown ? undefined : birthTime,
          isLunar,
          gender,
        }),
      });
      if (res.status === 409) {
        setStage('done');
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? '제출에 실패했어요');
      }
      setResult(await res.json());
      setStage('result');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '오류가 났어요');
    } finally {
      setSubmitting(false);
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <main className="min-h-dvh w-full max-w-md mx-auto px-5 py-10 bg-[var(--color-paper)] text-ink overflow-x-hidden">
      <div className="flex flex-col items-center text-center">
        <KkobukSprite variant="hero" size="lg" ariaLabel="꼬북이" />
        <h1 className="logo-brush text-4xl mt-3">꼬북점 占</h1>
      </div>

      {stage === 'loading' && (
        <p className="mt-10 text-center text-sm font-bold text-muted">불러오는 중...</p>
      )}

      {stage === 'expired' && (
        <Card className="mt-8 p-6 text-center">
          <p className="text-lg font-black text-navy">만료되었거나 없는 초대예요</p>
          <p className="mt-2 text-sm font-semibold text-muted">
            초대 링크를 다시 받아보거나, 직접 꼬북점을 시작해보세요.
          </p>
          <a href="/login" className="mt-5 inline-block rounded-2xl bg-navy text-white px-5 py-3 text-sm font-black">
            꼬북점 시작하기
          </a>
        </Card>
      )}

      {stage === 'done' && (
        <Card className="mt-8 p-6 text-center">
          <Badge tone="mint">완료된 초대</Badge>
          <p className="mt-3 text-lg font-black text-navy">이미 궁합을 본 초대예요</p>
          <p className="mt-2 text-sm font-semibold text-muted">
            나도 내 사주와 인연을 보고 싶다면 꼬북점을 시작해보세요.
          </p>
          <a href="/login" className="mt-5 inline-block rounded-2xl bg-navy text-white px-5 py-3 text-sm font-black">
            내 등껍질 보러가기
          </a>
        </Card>
      )}

      {stage === 'form' && (
        <>
          <div className="mt-6 text-center">
            <Badge tone="gold">궁합 초대</Badge>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-navy leading-snug">
              {hostName}님이<br />궁합을 보고 싶어 해요 🐢
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#82786D]">
              생년월일시만 넣으면 {hostName}님과의 궁합이 바로 나와요. 가입 안 해도 돼요.
            </p>
          </div>

          <Card className="mt-6 p-5 space-y-4">
            <Field label="이름 또는 닉네임">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름"
                className="w-full h-12 rounded-2xl bg-white px-4 text-sm font-bold text-navy border border-navy/10 focus:outline-none focus:ring-2 focus:ring-mint" />
            </Field>
            <Field label="생년월일">
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                className="w-full h-12 rounded-2xl bg-white px-4 text-sm font-bold text-navy border border-navy/10 focus:outline-none focus:ring-2 focus:ring-mint" />
              <div className="mt-3">
                <Toggle options={[{ value: 'solar' as const, label: '양력' }, { value: 'lunar' as const, label: '음력' }]}
                  value={isLunar ? 'lunar' : 'solar'} onChange={(v) => setIsLunar(v === 'lunar')} />
              </div>
            </Field>
            <Field label="태어난 시간">
              {!timeUnknown && (
                <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}
                  className="w-full h-12 rounded-2xl bg-white px-4 text-sm font-bold text-navy border border-navy/10 focus:outline-none focus:ring-2 focus:ring-mint" />
              )}
              <label className="mt-3 flex items-center gap-2 text-xs font-bold text-muted">
                <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
                시간을 모르겠어요
              </label>
            </Field>
            <Field label="성별">
              <Toggle options={[{ value: 'M' as const, label: '남성' }, { value: 'F' as const, label: '여성' }]}
                value={gender} onChange={setGender} />
            </Field>
            {err && <p className="text-sm text-red font-bold">{err}</p>}
            <ButtonPrimary tone="mint" onClick={submit} disabled={submitting}>
              {submitting ? '궁합 보는 중...' : `${hostName}님과 궁합 보기`}
            </ButtonPrimary>
          </Card>
          <p className="mt-3 text-center text-[11px] font-bold text-muted">
            입력한 정보는 궁합 계산에만 쓰여요.
          </p>
        </>
      )}

      {stage === 'result' && result && (
        <>
          <Card className="mt-8 p-6 text-center">
            <p className="text-xs font-extrabold text-muted">
              {result.hostName} ↔ {result.guestName}
            </p>
            <div className="mt-2 text-6xl font-black text-mint-dark">{result.score}</div>
            <p className="text-sm font-bold text-muted">궁합 점수</p>
            {result.headline && (
              <p className="mt-3 text-base font-black text-navy">{result.headline}</p>
            )}
            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#3C4650]">
              {result.summary}
            </p>
            {result.highlights.length > 0 && (
              <ul className="mt-3 space-y-1 text-left text-sm font-bold text-navy">
                {result.highlights.map((h) => (
                  <li key={h} className="flex gap-1.5"><span className="text-mint-dark">✓</span>{h}</li>
                ))}
              </ul>
            )}
          </Card>
          <a href={`${baseUrl}/login`}
            className="mt-5 block w-full rounded-2xl bg-navy text-white py-4 text-center font-black">
            내 사주·전체 궁합 보러가기 →
          </a>
          <p className="mt-2 text-center text-[11px] font-bold text-muted">
            {result.hostName}님에게도 이 궁합이 저장됐어요.
          </p>
        </>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-extrabold text-muted mb-2 ml-1">{label}</p>
      {children}
    </div>
  );
}
