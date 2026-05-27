/**
 * 새 한자 표기 룰이 daily one_liner / recommend / avoid에 제대로
 * 적용되는지 검증.
 *
 * Usage: pnpm exec tsx scripts/verify-daily.ts
 */

function loadEnvLocal() {
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf-8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  const { buildSajuResult } = await import('../src/lib/saju');
  const { generateDaily } = await import('../src/lib/llm/daily');
  const { calculatePalja } = await import('../src/lib/saju/palja');

  const saju = buildSajuResult({
    birthDate: '1985-11-14',
    birthTime: '14:05',
    isLunar: false,
    gender: 'M',
  });

  const today = new Date();
  const ymd = today.toISOString().slice(0, 10);
  const todayPillar = calculatePalja({
    birthDate: ymd,
    isLunar: false,
    gender: 'M',
  });
  // Daily 일진은 day pillar — calculatePalja는 day 기준으로 정확함.
  const iljiGan = todayPillar.day.ganHanja;
  const iljiJi = todayPillar.day.jiHanja;

  console.log(`\n=== Daily 검증 ===`);
  console.log(`사주: 1985-11-14 14:05 male solar`);
  console.log(`오늘: ${ymd}, 일진 ${iljiGan}${iljiJi}`);

  const result = await generateDaily({
    saju,
    date: ymd,
    iljiGan,
    iljiJi,
    name: 'Hi',
  });

  console.log(`\n=== 결과 ===`);
  console.log('one_liner :', result.one_liner);
  console.log('lucky     :', result.lucky_color, '·', result.lucky_number, '·', result.lucky_direction);
  console.log('mood      :', result.mood);
  console.log('recommend :');
  for (const r of result.recommend) console.log('  ✓', r);
  console.log('avoid     :');
  for (const a of result.avoid) console.log('  !', a);

  // 한자 단독 노출 자동 검출.
  // 한자 시퀀스가 (a) 한글 직후이고 (b) 직후가 ')'로 닫히지 않으면 단독 노출.
  // 즉 "경자(庚子)" 같이 "한글( 한자 )" 형식은 OK.
  // "庚子가 들어와" 같이 한자가 한글에 선행하면 단독 노출.
  const allText = [result.one_liner, ...result.recommend, ...result.avoid].join('\n');
  const standaloneHanja: string[] = [];
  // 한자 시퀀스 찾기
  const matches = Array.from(allText.matchAll(/[一-鿿]+/g));
  for (const m of matches) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const prev = start > 0 ? allText[start - 1] : '';
    const next = end < allText.length ? allText[end] : '';
    // 한글 다음에 '(' 가 있고 한자 시퀀스 다음이 ')' 이면 보조 표기로 OK.
    const isParenthetical = prev === '(' && next === ')';
    if (!isParenthetical) {
      standaloneHanja.push(m[0]);
    }
  }
  console.log('\n=== 한자 단독 노출 검사 ===');
  if (!standaloneHanja || standaloneHanja.length === 0) {
    console.log('✅ 한자 단독 노출 없음. 모두 한글 우선 형식.');
  } else {
    console.log('❌ 한자 단독 노출 발견:', standaloneHanja);
  }
  console.log('');
}

main().catch((e) => {
  console.error('verify-daily failed:', e);
  process.exit(1);
});
