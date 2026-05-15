'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';

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
    <main className="min-h-dvh bg-[var(--color-paper)] text-[var(--color-ink)] px-6 py-8">
      <div className="flex flex-col items-center">
        <KkobukAvatar size="md" />
        <h1 className="mt-4 text-xl font-bold">너를 알려줘</h1>
        <p className="text-xs opacity-60 mt-1">사주 8자는 이 정보로 계산해</p>
      </div>

      <div className="mt-8 space-y-5">
        <Field label="이름 또는 닉네임">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="꼬북이"
            className="w-full rounded-2xl bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-shell-dark)]"
          />
        </Field>

        <Field label="생년월일">
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full rounded-2xl bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-shell-dark)]"
          />
          <div className="mt-2 flex gap-2 text-sm">
            <Pill active={!isLunar} onClick={() => setIsLunar(false)}>
              양력
            </Pill>
            <Pill active={isLunar} onClick={() => setIsLunar(true)}>
              음력
            </Pill>
            {isLunar && (
              <Pill active={isLeapMonth} onClick={() => setIsLeapMonth((v) => !v)}>
                윤달
              </Pill>
            )}
          </div>
        </Field>

        <Field label="태어난 시간">
          {!timeUnknown && (
            <input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className="w-full rounded-2xl bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-shell-dark)]"
            />
          )}
          <label className="mt-2 flex items-center gap-2 text-sm opacity-80">
            <input
              type="checkbox"
              checked={timeUnknown}
              onChange={(e) => setTimeUnknown(e.target.checked)}
            />
            시간을 모르겠어 (시주 없이 봄)
          </label>
        </Field>

        <Field label="성별">
          <div className="flex gap-2">
            <Pill active={gender === 'M'} onClick={() => setGender('M')}>
              남성
            </Pill>
            <Pill active={gender === 'F'} onClick={() => setGender('F')}>
              여성
            </Pill>
          </div>
        </Field>

        {err && <p className="text-sm text-red-500">{err}</p>}

        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-2xl bg-[var(--color-shell-dark)] text-white py-4 font-semibold disabled:opacity-60"
        >
          {loading ? '꼬북이가 계산하는 중...' : '내 등껍질 만들기'}
        </button>
      </div>

    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-semibold mb-2">{label}</div>
      {children}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm border transition ${
        active
          ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
          : 'bg-white text-[var(--color-ink)] border-black/10'
      }`}
    >
      {children}
    </button>
  );
}
