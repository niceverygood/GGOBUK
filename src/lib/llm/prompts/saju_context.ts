import type { SajuResult, Sipsung } from '@/lib/saju/types';
import { analyzeSaju, strongestOhaeng, weakestOhaeng } from '@/lib/saju/analysis';
import { computeAdvanced, yukchin } from '@/lib/saju/advanced';
import { iljuProfileOf } from '@/lib/saju/ilju_profile';
import { CHEONGAN_YINYANG, JIJI_YINYANG } from '@/lib/saju/constants';
import { buildSignatureBehaviors } from '@/lib/saju/signature_behaviors';

export function formatSajuContext(saju: SajuResult, name?: string): string {
  const { palja, ilgan, ohaengCount, sipsung, sinsal, daewoon } = saju;
  const analysis = analyzeSaju(saju);
  const advanced = computeAdvanced(palja);
  const gender = saju.input.gender;
  const lines: string[] = [];

  if (name) lines.push(`이름: ${name}`);
  lines.push(`성별: ${saju.input.gender === 'M' ? '남성' : '여성'}`);
  lines.push(
    `생년월일: ${saju.input.birthDate} ${saju.input.birthTime ?? '시간 미상'} (${
      saju.input.isLunar ? '음력' : '양력'
    })`,
  );
  lines.push(`현재 나이: ${analysis.currentAge}세 (${analysis.currentSewoon.year}년 기준)`);
  lines.push('');

  lines.push('## 사주팔자');
  lines.push(`연주: ${palja.year.ganHanja}${palja.year.jiHanja} (${palja.year.gan}${palja.year.ji})`);
  lines.push(
    `월주: ${palja.month.ganHanja}${palja.month.jiHanja} (${palja.month.gan}${palja.month.ji})`,
  );
  lines.push(
    `일주: ${palja.day.ganHanja}${palja.day.jiHanja} (${palja.day.gan}${palja.day.ji}) ← 본인`,
  );
  if (palja.time) {
    lines.push(
      `시주: ${palja.time.ganHanja}${palja.time.jiHanja} (${palja.time.gan}${palja.time.ji})`,
    );
  } else {
    lines.push('시주: 미상');
  }
  lines.push(`일간: ${ilgan}`);
  lines.push('');

  // ──── 일주 60갑자 특성 (가장 중요한 단일 자료) ────
  const ilju = iljuProfileOf(palja.day.ganIdx, palja.day.jiIdx);
  if (ilju) {
    lines.push('## 일주 60갑자 명조 (이 사주를 한 줄로 정의하는 자료)');
    lines.push(`${ilju.name} (${ilju.hanja}) 일주 — 60갑자 중 ${ilju.index + 1}번째`);
    lines.push(`일간: ${ilju.ganNote}`);
    lines.push(`일지: ${ilju.jiNote}`);
    lines.push(`자존감/정체성: ${ilju.ego}`);
    lines.push(`연애/결혼: ${ilju.love}`);
    lines.push(`일/재물: ${ilju.career}`);
    lines.push(`강점: ${ilju.strengths.join(', ')}`);
    lines.push(`주의/그늘: ${ilju.watch.join(', ')}`);
    lines.push(`키워드: ${ilju.keywords.join(' · ')}`);
    lines.push('→ "이 일주가 이래서 OO하다" 식의 인용을 반드시 한 번 이상 활용할 것.');
    lines.push('');
  }

  // ──── 음양 비율 ────
  const allGanIdx = [palja.year.ganIdx, palja.month.ganIdx, palja.day.ganIdx];
  if (palja.time) allGanIdx.push(palja.time.ganIdx);
  const allJiIdx = [palja.year.jiIdx, palja.month.jiIdx, palja.day.jiIdx];
  if (palja.time) allJiIdx.push(palja.time.jiIdx);
  const yang = allGanIdx.filter((i) => CHEONGAN_YINYANG[i] === 0).length +
    allJiIdx.filter((i) => JIJI_YINYANG[i] === 0).length;
  const yin = allGanIdx.length + allJiIdx.length - yang;
  lines.push(`## 음양 비율: 양 ${yang} · 음 ${yin} ${
    yang > yin + 2 ? '(양 쏠림 — 외향/활동성 강)' :
    yin > yang + 2 ? '(음 쏠림 — 내향/수렴성 강)' :
    '(균형)'
  }`);
  lines.push('');

  lines.push('## 오행 분포');
  lines.push(
    `목 ${ohaengCount.목}, 화 ${ohaengCount.화}, 토 ${ohaengCount.토}, 금 ${ohaengCount.금}, 수 ${ohaengCount.수}`,
  );
  const [strong, strongCount] = strongestOhaeng(saju);
  const [weak, weakCount] = weakestOhaeng(saju);
  lines.push(`표면 개수: 강한 기운 ${strong}(${strongCount}) · 부족한 기운 ${weak}(${weakCount})`);
  const w = advanced.weighted;
  lines.push(
    `지장간 가중 점수(정기·중기·여기 + 월령 보정): 목 ${w.목} / 화 ${w.화} / 토 ${w.토} / 금 ${w.금} / 수 ${w.수}`,
  );
  lines.push('→ 실제 강약은 표면 개수보다 가중 점수를 우선해서 판단할 것.');
  lines.push('');

  lines.push('## 십성 + 육친(六親)');
  const posLabel: Record<string, string> = {
    yearGan: '연간', yearJi: '연지', monthGan: '월간', monthJi: '월지',
    dayJi: '일지', timeGan: '시간', timeJi: '시지',
  };
  // 십성 카운트 집계 — 강한 십성 그룹이 사주의 핵심 욕구·역할을 보여준다.
  const sipsungCount: Record<string, number> = {};
  for (const [k, v] of Object.entries(sipsung)) {
    if (v) {
      lines.push(`${posLabel[k] ?? k}: ${v} = ${yukchin(v as Sipsung, gender)}`);
      sipsungCount[v] = (sipsungCount[v] ?? 0) + 1;
    }
  }
  // 5대 그룹별 집계 (비겁/식상/재성/관성/인성)
  const groupOf: Record<string, string> = {
    비견: '비겁', 겁재: '비겁',
    식신: '식상', 상관: '식상',
    편재: '재성', 정재: '재성',
    편관: '관성', 정관: '관성',
    편인: '인성', 정인: '인성',
  };
  const groupCount: Record<string, number> = {};
  for (const [s, n] of Object.entries(sipsungCount)) {
    const g = groupOf[s];
    if (g) groupCount[g] = (groupCount[g] ?? 0) + n;
  }
  const groups = ['비겁', '식상', '재성', '관성', '인성']
    .map((g) => `${g}${groupCount[g] ?? 0}`)
    .join(' · ');
  lines.push(`5대 십성 그룹 카운트: ${groups}`);
  const sortedGroups = Object.entries(groupCount).sort((a, b) => b[1] - a[1]);
  if (sortedGroups.length > 0) {
    const top = sortedGroups[0];
    const groupHint: Record<string, string> = {
      비겁: '자존감·독립성·경쟁심이 동력',
      식상: '표현·창의·생산성이 동력',
      재성: '돈·결과·현실 감각이 동력',
      관성: '책임·명예·규범이 동력',
      인성: '배움·보호·정신적 안정이 동력',
    };
    lines.push(`→ 가장 강한 그룹: ${top[0]} (${top[1]}개) — ${groupHint[top[0]]}`);
  }
  lines.push('');

  lines.push('## 십이운성 (十二運星 — 일간이 각 지지에서 갖는 기운 단계)');
  for (const u of advanced.unseong) {
    lines.push(`${u.position} ${u.jiji}: ${u.stage} (${u.meaning})`);
  }
  lines.push(`→ 일지 십이운성 = ${advanced.dayStage} (자존감·배우자 관계 해석의 핵심)`);
  lines.push('');

  // ──── 명리 분석 (코드 계산) ────
  lines.push('## 일간 강약 (身強身弱)');
  lines.push(
    `${analysis.strength.label} · 강도 점수 ${analysis.strength.score}/100`,
  );
  for (const r of analysis.strength.reasons) lines.push(`- ${r}`);
  lines.push('판정 3요소:');
  for (const d of advanced.rootedness.detail) lines.push(`- ${d}`);
  lines.push('');

  lines.push('## 격국 (格局)');
  lines.push(`${analysis.gyeokguk.primary}`);
  lines.push(`근거: ${analysis.gyeokguk.rationale}`);
  lines.push('');

  lines.push('## 용신 후보 (用神)');
  lines.push(`주 용신: ${analysis.yongsin.main}${analysis.yongsin.alt ? ` (보조 ${analysis.yongsin.alt})` : ''}`);
  lines.push(`근거: ${analysis.yongsin.rationale}`);
  lines.push('');

  if (analysis.tongeun.length > 0) {
    lines.push('## 통근/투출 (通根)');
    for (const t of analysis.tongeun) {
      lines.push(`- ${t.position} 천간 ${t.gan} → 지지 ${t.ji}에 ${t.through}로 통근`);
    }
    lines.push('');
  }

  if (analysis.interactions.length > 0) {
    lines.push('## 원국 내 합·충·형·파·회');
    for (const i of analysis.interactions) {
      lines.push(`- [${i.type}] ${i.detail} (${i.positions.join('-')})`);
    }
    lines.push('');
  }

  if (sinsal.length > 0) {
    lines.push('## 주요 신살');
    for (const s of sinsal) lines.push(`- ${s.name} (${s.position}): ${s.description}`);
    lines.push('');
  }

  lines.push('## 궁위 (宮位 — 자리별 인생 영역)');
  for (const pal of advanced.palaces) {
    lines.push(`- ${pal.position}: ${pal.governs} · ${pal.ageRange}`);
  }
  lines.push('→ 특정 자리의 글자/십성을 해석할 때 그 자리가 관장하는 영역과 연결할 것.');
  lines.push('');

  lines.push('## 진행 중 흐름');
  if (analysis.currentDaewoon) {
    const cd = analysis.currentDaewoon;
    lines.push(
      `현재 대운: ${cd.pillar.ganHanja}${cd.pillar.jiHanja} (${cd.sipsung}) · ${cd.startAge}~${cd.startAge + 9}세 / ${cd.startYear}~${cd.startYear + 9}`,
    );
  } else {
    lines.push('현재 대운: 데이터 부족 또는 대운 시작 이전');
  }
  const sw = analysis.currentSewoon;
  lines.push(
    `올해 세운: ${sw.pillar.ganHanja}${sw.pillar.jiHanja} (${sw.pillar.gan}${sw.pillar.ji}, ${sw.sipsung})`,
  );
  lines.push('');

  lines.push('## 대운 8주기');
  for (const d of daewoon.slice(0, 8)) {
    lines.push(
      `${d.startAge}세~${d.startAge + 9}세 (${d.startYear}~): ${d.pillar.ganHanja}${d.pillar.jiHanja} (${d.sipsung})`,
    );
  }
  lines.push('');

  // ──── Signature behavior 후보군 (소름 효과의 핵심 재료) ────
  // 이 후보들을 그대로 베끼지 말고 사용자의 다른 지표와 결합해 그 사람만의
  // micro-observation으로 합성해야 한다. 자세한 사용법은 premium_saju.ts 참조.
  const topGroup = sortedGroups[0]?.[0] ?? null;
  const yinYangTilt: 'yang_heavy' | 'yin_heavy' | 'balanced' =
    yang > yin + 2 ? 'yang_heavy' : yin > yang + 2 ? 'yin_heavy' : 'balanced';
  const sig = buildSignatureBehaviors({
    topSipsungGroup: topGroup,
    iljiStage: advanced.dayStage,
    yinYangTilt,
    weakestOhaeng: weak as '목' | '화' | '토' | '금' | '수',
  });
  lines.push('## Signature Behavior 후보 (소름 효과 재료 — 절대 그대로 베끼지 말 것)');
  lines.push('아래 후보들은 이 사주가 통계적으로 fit하는 micro-behavior다. 사용자의 일주·격국·진행 중 대운과 결합해, 사용자가 "어? 이거 진짜 나 그래"라고 무릎 칠 한 줄로 합성한다. 그대로 인용하면 일반론이 된다.');
  if (sig.fromSipsung.length > 0) {
    lines.push(`[${topGroup} 1위 그룹]`);
    for (const s of sig.fromSipsung) lines.push(`- ${s}`);
  }
  if (sig.fromIljiStage.length > 0) {
    lines.push(`[일지 ${advanced.dayStage} 단계]`);
    for (const s of sig.fromIljiStage) lines.push(`- ${s}`);
  }
  if (sig.fromYinYang.length > 0) {
    lines.push(`[음양 ${yinYangTilt === 'yang_heavy' ? '양 쏠림' : yinYangTilt === 'yin_heavy' ? '음 쏠림' : '균형'}]`);
    for (const s of sig.fromYinYang) lines.push(`- ${s}`);
  }
  if (sig.fromWeakOhaeng.length > 0) {
    lines.push(`[부족한 오행 ${weak}]`);
    for (const s of sig.fromWeakOhaeng) lines.push(`- ${s}`);
  }

  return lines.join('\n');
}
