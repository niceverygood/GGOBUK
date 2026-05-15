// Standalone demo: compute Hi's full saju without any DB/network.
import { buildSajuResult } from '../src/lib/saju';

const result = buildSajuResult({
  birthDate: '1985-11-14',
  birthTime: '14:05',
  isLunar: false,
  gender: 'M',
});

const { palja, ohaengCount, sipsung, sinsal, daewoon } = result;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  Hi의 사주팔자 — 1985-11-14 14:05 male solar');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('      시주    일주    월주    연주');
console.log(`  天   ${palja.time?.ganHanja}      ${palja.day.ganHanja}      ${palja.month.ganHanja}      ${palja.year.ganHanja}`);
console.log(`  地   ${palja.time?.jiHanja}      ${palja.day.jiHanja}      ${palja.month.jiHanja}      ${palja.year.jiHanja}`);
console.log('');
console.log('  Expected: 시 丁未 / 일 丁巳 / 월 丁亥 / 연 乙丑');
const ok =
  palja.time?.ganHanja === '丁' &&
  palja.time?.jiHanja === '未' &&
  palja.day.ganHanja === '丁' &&
  palja.day.jiHanja === '巳' &&
  palja.month.ganHanja === '丁' &&
  palja.month.jiHanja === '亥' &&
  palja.year.ganHanja === '乙' &&
  palja.year.jiHanja === '丑';
console.log(`  Match: ${ok ? '✅ PASS' : '❌ FAIL'}`);
console.log('');
console.log('  일간: ' + palja.day.gan + ' (' + palja.day.ganOhaeng + ')');
console.log('');
console.log('━━━ 오행 분포 ━━━');
console.log(`  목 ${ohaengCount.목} · 화 ${ohaengCount.화} · 토 ${ohaengCount.토} · 금 ${ohaengCount.금} · 수 ${ohaengCount.수}`);
console.log('');
console.log('━━━ 십성 ━━━');
console.log(`  연간(${palja.year.gan}): ${sipsung.yearGan}    연지(${palja.year.ji}): ${sipsung.yearJi}`);
console.log(`  월간(${palja.month.gan}): ${sipsung.monthGan}    월지(${palja.month.ji}): ${sipsung.monthJi}`);
console.log(`  일지(${palja.day.ji}): ${sipsung.dayJi}`);
if (sipsung.timeGan) console.log(`  시간(${palja.time?.gan}): ${sipsung.timeGan}    시지(${palja.time?.ji}): ${sipsung.timeJi}`);
console.log('');
console.log('━━━ 신살 ━━━');
if (sinsal.length === 0) console.log('  (없음)');
for (const s of sinsal) console.log(`  ${s.name} (${s.position})`);
console.log('');
console.log('━━━ 대운 8주기 ━━━');
for (const d of daewoon) {
  console.log(
    `  ${String(d.startAge).padStart(3)}–${d.startAge + 9}세 (${d.startYear}–${d.startYear + 9})  ${d.pillar.ganHanja}${d.pillar.jiHanja}  ${d.sipsung}`,
  );
}
console.log('');
