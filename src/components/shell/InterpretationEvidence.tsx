import { Badge } from '@/components/ui/primitives';
import type {
  Ohaeng,
  OhaengCount,
  Palja,
  Pillar,
  SinsalEntry,
  SipsungMap,
} from '@/lib/saju/types';
import type { InterpretationCategory } from '@/types/db';

export interface InterpretationEvidenceProfile {
  palja: Palja | null;
  ohaeng_count: OhaengCount | null;
  sipsung: SipsungMap | null;
  sinsal: SinsalEntry[] | null;
  ilgan: string | null;
}

const OHAENG_META: Record<
  Ohaeng,
  { label: string; color: string; soft: string; text: string }
> = {
  목: {
    label: '목',
    color: 'var(--color-ohaeng-wood)',
    soft: 'rgba(93,173,226,0.16)',
    text: '#234960',
  },
  화: {
    label: '화',
    color: 'var(--color-ohaeng-fire)',
    soft: 'rgba(231,76,60,0.15)',
    text: '#7B261E',
  },
  토: {
    label: '토',
    color: 'var(--color-ohaeng-earth)',
    soft: 'rgba(244,208,63,0.24)',
    text: '#6B5A24',
  },
  금: {
    label: '금',
    color: 'var(--color-ohaeng-metal)',
    soft: 'rgba(236,240,241,0.9)',
    text: '#52606B',
  },
  수: {
    label: '수',
    color: 'var(--color-ohaeng-water)',
    soft: 'rgba(52,73,94,0.14)',
    text: '#2C3E50',
  },
};

const CATEGORY_LENS: Record<
  InterpretationCategory,
  { title: string; points: string[] }
> = {
  overview: {
    title: '원국 전체의 온도와 삶의 반복 패턴',
    points: [
      '강한 오행이 만든 기본 성향',
      '부족한 기운의 보완법',
      '대운에서 커지는 주제',
    ],
  },
  ohaeng: {
    title: '오행의 과다·부족이 현실에 나타나는 방식',
    points: ['컨디션과 감정 리듬', '일 처리 방식', '관계에서 필요한 균형'],
  },
  ilju: {
    title: '일주가 말해주는 본질과 사랑 방식',
    points: ['일간의 생존 방식', '일지의 친밀감 패턴', '반복되는 선택 습관'],
  },
  strength: {
    title: '사주가 이미 잘 쓰고 있는 무기',
    points: [
      '강한 십성의 장점',
      '재능이 드러나는 장면',
      '돈과 평판으로 연결되는 길',
    ],
  },
  weakness: {
    title: '좋은 재능이 과해질 때 생기는 그림자',
    points: ['오행의 쏠림', '관계에서 오해받는 지점', '현실적인 처방'],
  },
  personality: {
    title: '겉모습과 속마음이 갈리는 지점',
    points: ['첫인상', '감정 처리 방식', '혼자 있을 때 회복법'],
  },
  career: {
    title: '일의 구조와 성과가 나는 환경',
    points: ['잘 맞는 역할', '조직/독립 성향', '피해야 할 업무 리듬'],
  },
  wealth: {
    title: '돈이 모이고 새는 패턴',
    points: ['수입이 붙는 방식', '지출이 커지는 순간', '안정적인 축적법'],
  },
  love: {
    title: '끌림과 안정감의 반복 구조',
    points: ['끌리는 상대 유형', '사랑받고 싶은 방식', '관계가 흔들리는 말투'],
  },
  family: {
    title: '가족 안에서 맡기 쉬운 역할',
    points: [
      '부모와의 거리감',
      '책임감의 무게',
      '내 가정을 만들 때 필요한 기준',
    ],
  },
  friends: {
    title: '나를 키우는 인연과 소모시키는 인연',
    points: [
      '친구·동료에게 보이는 인상',
      '도움이 되는 관계',
      '선을 그어야 할 관계',
    ],
  },
  direction: {
    title: '기운을 살리는 공간·색·루틴',
    points: [
      '부족한 오행 보완',
      '집중이 잘 되는 환경',
      '운을 낭비하지 않는 습관',
    ],
  },
};

const POSITION_LABELS: Array<{
  key: keyof Palja;
  label: string;
  caption: string;
}> = [
  { key: 'year', label: '연주', caption: '뿌리' },
  { key: 'month', label: '월주', caption: '사회' },
  { key: 'day', label: '일주', caption: '나' },
  { key: 'time', label: '시주', caption: '미래' },
];

export function InterpretationEvidence({
  profile,
  category,
}: {
  profile: InterpretationEvidenceProfile;
  category: InterpretationCategory;
}) {
  const { palja, ohaeng_count: ohaengCount, sipsung, sinsal } = profile;
  if (!palja || !ohaengCount || !sipsung) return null;

  const lens = CATEGORY_LENS[category];
  const entries = (Object.keys(OHAENG_META) as Ohaeng[]).map((key) => ({
    key,
    count: ohaengCount[key] ?? 0,
  }));
  const total = Math.max(
    1,
    entries.reduce((sum, item) => sum + item.count, 0),
  );
  const strongest = entries.reduce((a, b) => (b.count > a.count ? b : a));
  const weakest = entries.reduce((a, b) => (b.count < a.count ? b : a));
  const sipsungChips = [
    ['월간', sipsung.monthGan],
    ['월지', sipsung.monthJi],
    ['일지', sipsung.dayJi],
    ['시간', sipsung.timeGan],
    ['시지', sipsung.timeJi],
  ].filter(([, value]) => Boolean(value));

  return (
    <section className="mt-5 rounded-3xl border border-navy/10 bg-white/80 p-4 shadow-[0_12px_30px_rgba(44,62,80,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold text-muted">AI 판독 근거</p>
          <h2 className="mt-0.5 text-lg font-black text-navy">{lens.title}</h2>
        </div>
        <Badge tone="mint" className="shrink-0">
          원국 기반
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-1.5">
        {POSITION_LABELS.map(({ key, label, caption }) => (
          <PillarTile
            key={key}
            label={label}
            caption={caption}
            pillar={palja[key]}
            active={key === 'day'}
          />
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-ivory/70 px-3 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-navy">오행 체감 온도</p>
          <p className="text-[10px] font-extrabold text-muted">
            강점 {strongest.key} · 보완 {weakest.key}
          </p>
        </div>
        <div className="mt-3 space-y-2">
          {entries.map(({ key, count }) => {
            const meta = OHAENG_META[key];
            const width = `${Math.max(count > 0 ? 10 : 4, (count / total) * 100)}%`;
            return (
              <div
                key={key}
                className="grid grid-cols-[24px_1fr_20px] items-center gap-2"
              >
                <span
                  className="text-xs font-black"
                  style={{ color: meta.text }}
                >
                  {meta.label}
                </span>
                <div className="h-2.5 overflow-hidden rounded-full bg-navy/5">
                  <div
                    className="h-full rounded-full"
                    style={{ width, backgroundColor: meta.color }}
                  />
                </div>
                <span className="text-right text-xs font-black text-navy">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <div className="rounded-2xl border border-navy/10 bg-white/65 px-3 py-3">
          <p className="text-xs font-black text-navy">
            이번 풀이의 판독 포인트
          </p>
          <ul className="mt-2 space-y-1.5">
            {lens.points.map((point) => (
              <li
                key={point}
                className="flex gap-2 text-[12px] font-bold leading-relaxed text-[#6F665E]"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {sipsungChips.slice(0, 5).map(([label, value]) => (
            <span
              key={`${label}-${value}`}
              className="rounded-full bg-navy/[0.06] px-2.5 py-1.5 text-[11px] font-black text-navy"
            >
              {label} · {value}
            </span>
          ))}
          {(sinsal ?? []).slice(0, 2).map((item) => (
            <span
              key={`${item.position}-${item.name}`}
              className="rounded-full bg-gold/25 px-2.5 py-1.5 text-[11px] font-black text-[#6B5A24]"
            >
              {item.position} · {item.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function PillarTile({
  label,
  caption,
  pillar,
  active,
}: {
  label: string;
  caption: string;
  pillar: Pillar | null;
  active: boolean;
}) {
  if (!pillar) {
    return (
      <div className="min-h-[86px] rounded-2xl border border-dashed border-navy/15 bg-white/55 p-2 text-center">
        <p className="text-[10px] font-black text-muted">{label}</p>
        <p className="mt-3 text-xs font-black text-muted">미상</p>
      </div>
    );
  }
  const meta = OHAENG_META[pillar.ganOhaeng];
  return (
    <div
      className={`min-h-[86px] rounded-2xl border p-2 text-center ${
        active
          ? 'border-mint bg-mint/10 shadow-[0_8px_18px_rgba(78,205,196,0.18)]'
          : 'border-navy/10 bg-white/65'
      }`}
    >
      <div className="flex items-center justify-center gap-1">
        <span className="text-[10px] font-black text-muted">{label}</span>
        {active && <span className="h-1.5 w-1.5 rounded-full bg-mint" />}
      </div>
      <p className="font-hanja mt-1 text-[22px] font-black leading-none text-navy">
        {pillar.ganHanja}
        {pillar.jiHanja}
      </p>
      <p
        className="mx-auto mt-2 rounded-full px-2 py-1 text-[10px] font-black"
        style={{ backgroundColor: meta.soft, color: meta.text }}
      >
        {pillar.ganOhaeng} · {caption}
      </p>
    </div>
  );
}
