'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Badge, Card, SpeechBubble, Toggle, ButtonPrimary } from '@/components/ui/primitives';

export default function SajuOnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [isLunar, setIsLunar] = useState(false);
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!name.trim() || !birthDate) {
      setErr('이름과 생년월일은 필수야');
      return;
    }
    if (!timeUnknown && !birthTime) {
      setErr('생시를 입력하거나 "시간 모름"을 선택해줘');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/saju/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          birthDate,
          birthTime: timeUnknown ? undefined : birthTime,
          isLunar,
          isLeapMonth,
          gender,
          relationType: 'self',
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? '계산에 실패했어');
      }
      router.push('/onboarding/result');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '오류가 났어');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh px-5 pt-10 pb-32 relative">
      <div className="hanji-overlay" />
      <div className="relative">
        <Badge>🐢 첫 등껍질 생성</Badge>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-navy leading-snug">
          태어난 순간을 알려주면<br />꼬북이가 등껍질을 펼쳐볼게요
        </h1>

        <div className="flex items-end gap-3 mt-6 mb-5">
          <div className="flex-1">
            <SpeechBubble>이름은 별명도 괜찮아. 생시를 모르면 &lsquo;시간 모름&rsquo;으로 봐줄게!</SpeechBubble>
          </div>
          <div className="shrink-0">
            <KkobukAvatar size="md" />
          </div>
        </div>

        <Card className="p-5 space-y-5">
          <Field label="이름 또는 닉네임">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="꼬북이"
              className="w-full h-12 rounded-2xl bg-white px-4 text-sm font-bold text-navy border border-navy/10 focus:outline-none focus:ring-2 focus:ring-mint"
            />
          </Field>

          <Field label="생년월일">
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full h-12 rounded-2xl bg-white px-4 text-sm font-bold text-navy border border-navy/10 focus:outline-none focus:ring-2 focus:ring-mint"
            />
            <div className="mt-3">
              <Toggle
                options={[
                  { value: 'solar' as const, label: '양력' },
                  { value: 'lunar' as const, label: '음력' },
                ]}
                value={isLunar ? 'lunar' : 'solar'}
                onChange={(v) => setIsLunar(v === 'lunar')}
              />
              {isLunar && (
                <label className="mt-3 flex items-center gap-2 text-xs font-bold text-muted">
                  <input
                    type="checkbox"
                    checked={isLeapMonth}
                    onChange={(e) => setIsLeapMonth(e.target.checked)}
                  />
                  윤달이에요
                </label>
              )}
            </div>
          </Field>

          <Field label="태어난 시간">
            {!timeUnknown && (
              <input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className="w-full h-12 rounded-2xl bg-white px-4 text-sm font-bold text-navy border border-navy/10 focus:outline-none focus:ring-2 focus:ring-mint"
              />
            )}
            <label className="mt-3 flex items-center gap-2 text-xs font-bold text-muted">
              <input
                type="checkbox"
                checked={timeUnknown}
                onChange={(e) => setTimeUnknown(e.target.checked)}
              />
              시간을 모르겠어 (시주 없이 봄)
            </label>
          </Field>

          <Field label="성별">
            <Toggle
              options={[
                { value: 'M' as const, label: '남성' },
                { value: 'F' as const, label: '여성' },
              ]}
              value={gender}
              onChange={setGender}
            />
          </Field>
        </Card>

        {err && <p className="mt-4 text-sm text-red">{err}</p>}
      </div>

      <div className="fixed left-0 right-0 bottom-0 px-5 pb-6 pt-3 bg-gradient-to-t from-ivory via-ivory/95 to-transparent">
        <div className="max-w-md mx-auto">
          <ButtonPrimary tone="mint" onClick={submit} disabled={loading}>
            {loading ? '꼬북이가 계산하는 중...' : '내 등껍질 보러가기'}
          </ButtonPrimary>
        </div>
      </div>
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
