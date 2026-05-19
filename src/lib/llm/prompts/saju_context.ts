import type { SajuResult } from '@/lib/saju/types';
import { analyzeSaju, strongestOhaeng, weakestOhaeng } from '@/lib/saju/analysis';

export function formatSajuContext(saju: SajuResult, name?: string): string {
  const { palja, ilgan, ohaengCount, sipsung, sinsal, daewoon } = saju;
  const analysis = analyzeSaju(saju);
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

  lines.push('## 오행 분포');
  lines.push(
    `목 ${ohaengCount.목}, 화 ${ohaengCount.화}, 토 ${ohaengCount.토}, 금 ${ohaengCount.금}, 수 ${ohaengCount.수}`,
  );
  const [strong, strongCount] = strongestOhaeng(saju);
  const [weak, weakCount] = weakestOhaeng(saju);
  lines.push(`강한 기운: ${strong}(${strongCount}) · 부족한 기운: ${weak}(${weakCount})`);
  lines.push('');

  lines.push('## 십성');
  for (const [k, v] of Object.entries(sipsung)) {
    if (v) lines.push(`${k}: ${v}`);
  }
  lines.push('');

  // ──── 명리 분석 (코드 계산) ────
  lines.push('## 일간 강약 (身強身弱)');
  lines.push(
    `${analysis.strength.label} · 강도 점수 ${analysis.strength.score}/100`,
  );
  for (const r of analysis.strength.reasons) lines.push(`- ${r}`);
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

  return lines.join('\n');
}
