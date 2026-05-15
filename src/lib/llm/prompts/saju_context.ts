import type { SajuResult } from '@/lib/saju/types';

export function formatSajuContext(saju: SajuResult, name?: string): string {
  const { palja, ilgan, ohaengCount, sipsung, sinsal, daewoon } = saju;
  const lines: string[] = [];

  if (name) lines.push(`이름: ${name}`);
  lines.push(`성별: ${saju.input.gender === 'M' ? '남성' : '여성'}`);
  lines.push(
    `생년월일: ${saju.input.birthDate} ${saju.input.birthTime ?? '시간 미상'} (${
      saju.input.isLunar ? '음력' : '양력'
    })`,
  );
  lines.push('');

  lines.push('## 사주팔자');
  lines.push(`연주: ${palja.year.ganHanja}${palja.year.jiHanja} (${palja.year.gan}${palja.year.ji})`);
  lines.push(`월주: ${palja.month.ganHanja}${palja.month.jiHanja} (${palja.month.gan}${palja.month.ji})`);
  lines.push(`일주: ${palja.day.ganHanja}${palja.day.jiHanja} (${palja.day.gan}${palja.day.ji}) ← 본인`);
  if (palja.time) {
    lines.push(`시주: ${palja.time.ganHanja}${palja.time.jiHanja} (${palja.time.gan}${palja.time.ji})`);
  } else {
    lines.push('시주: 미상');
  }
  lines.push(`일간: ${ilgan}`);
  lines.push('');

  lines.push('## 오행 분포');
  lines.push(`목 ${ohaengCount.목}, 화 ${ohaengCount.화}, 토 ${ohaengCount.토}, 금 ${ohaengCount.금}, 수 ${ohaengCount.수}`);
  lines.push('');

  lines.push('## 십성');
  for (const [k, v] of Object.entries(sipsung)) {
    if (v) lines.push(`${k}: ${v}`);
  }
  lines.push('');

  if (sinsal.length > 0) {
    lines.push('## 주요 신살');
    for (const s of sinsal) {
      lines.push(`- ${s.name} (${s.position}): ${s.description}`);
    }
    lines.push('');
  }

  lines.push('## 대운');
  for (const d of daewoon.slice(0, 8)) {
    lines.push(
      `${d.startAge}세~${d.startAge + 9}세 (${d.startYear}~): ${d.pillar.ganHanja}${d.pillar.jiHanja} (${d.sipsung})`,
    );
  }

  return lines.join('\n');
}
