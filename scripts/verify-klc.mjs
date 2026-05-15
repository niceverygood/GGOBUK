// Verify korean-lunar-calendar against Hi's reference saju.
import KoreanLunarCalendar from 'korean-lunar-calendar';

const CHEONGAN_HANJA = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const JIJI_HANJA = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

const cases = [
  { y: 1985, m: 11, d: 14, expected: { yG: '乙', yJ: '丑', mG: '丁', mJ: '亥', dG: '丁', dJ: '巳' } },
  { y: 2024, m: 2, d: 3, expected: { yG: '癸', yJ: '卯' } },          // before 입춘
  { y: 2024, m: 2, d: 5, expected: { yG: '甲', yJ: '辰' } },          // after 입춘
];

for (const c of cases) {
  const klc = new KoreanLunarCalendar();
  const ok = klc.setSolarDate(c.y, c.m, c.d);
  const idx = klc.getGapJaIndex();
  const out = {
    yG: CHEONGAN_HANJA[idx.cheongan.year],
    yJ: JIJI_HANJA[idx.ganji.year],
    mG: CHEONGAN_HANJA[idx.cheongan.month],
    mJ: JIJI_HANJA[idx.ganji.month],
    dG: CHEONGAN_HANJA[idx.cheongan.day],
    dJ: JIJI_HANJA[idx.ganji.day],
  };
  console.log(`${c.y}-${c.m}-${c.d} setSolarDate=${ok}`, out, 'expected:', c.expected);
}
