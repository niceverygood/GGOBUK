'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KkobukAvatar } from '@/components/kkobuk/KkobukAvatar';
import { Badge, Card, SpeechBubble, Toggle, ButtonPrimary } from '@/components/ui/primitives';
import { savePreviewInput } from '@/lib/saju/preview';

export default function PreviewEntryPage() {
  const router = useRouter();
  const [name, setName] = useState('테스트');
  const [birthDate, setBirthDate] = useState('1985-11-14');
  const [birthTime, setBirthTime] = useState('14:05');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [isLunar, setIsLunar] = useState(false);
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [gender, setGender] = useState<'M' | 'F'>('M');

  function submit() {
    if (!name.trim() || !birthDate) return;
    if (!timeUnknown && !birthTime) return;
    savePreviewInput(
      {
        birthDate,
        birthTime: timeUnknown ? undefined : birthTime,
        isLunar,
        isLeapMonth,
        gender,
      },
      name,
    );
    router.push('/preview/result');
  }

  return (
    <main className="min-h-dvh w-full max-w-md mx-auto px-5 pt-10 pb-32 relative overflow-x-hidden">
      <div className="hanji-overlay" />
      <div className="relative">
        <Badge>🐢 미리보기 모드 · 로그인 없음</Badge>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-navy leading-snug">
          사주를 넣으면<br />등껍질 전체를 바로 펼쳐볼게요
        </h1>

        <div className="flex items-end gap-3 mt-6 mb-5">
          <div className="flex-1">
            <SpeechBubble>
              데모는 너의 데이터를 저장하지 않아. 브라우저에만 잠깐 들고 있을게.
            </SpeechBubble>
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

        <p className="mt-4 text-xs font-bold text-muted text-center">
          기본값은 Hi의 reference saju예요. 그대로 진행하면 1985-11-14 14:05 男(양)이 계산돼.
        </p>
      </div>

      <div className="fixed left-0 right-0 bottom-0 px-5 pb-6 pt-3 bg-gradient-to-t from-ivory via-ivory/95 to-transparent">
        <div className="max-w-md mx-auto">
          <ButtonPrimary tone="mint" onClick={submit}>
            등껍질 펼쳐보기
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
