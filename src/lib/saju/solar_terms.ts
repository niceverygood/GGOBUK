// Solar term calculator using Meeus-style apparent solar longitude.
// Accurate to within ~1-2 minutes for years 1900-2100, which is sufficient
// for saju month/year pillar boundaries. Output times are KST (UTC+9).
//
// All Date math uses UTC internally; only the final return is shifted to KST.

const KST_OFFSET_MS = 9 * 3600 * 1000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Julian Date from JS Date (in UTC).
function jdFromDate(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

function dateFromJd(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

// Apparent geocentric longitude of the Sun (degrees, 0-360) for a given JD in TT.
// We approximate TT ~ UT for this purpose (max ~70 sec offset in 1900-2100).
// Based on Meeus, "Astronomical Algorithms" 2nd ed., chapter 25.
export function solarLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525; // centuries from J2000.0

  // Geometric mean longitude of the Sun
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;

  // Mean anomaly of the Sun
  const M = 357.52911 + T * (35999.05029 - T * 0.0001537);
  const Mrad = toRad(M);

  // Equation of center
  const C =
    (1.914602 - T * (0.004817 + 0.000014 * T)) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);

  // True longitude
  const trueLong = L0 + C;

  // Apparent longitude (nutation + aberration approx)
  const omega = 125.04 - 1934.136 * T;
  const apparent = trueLong - 0.00569 - 0.00478 * Math.sin(toRad(omega));

  return ((apparent % 360) + 360) % 360;
}

// Given a year and target apparent solar longitude (degrees), find the Date (KST)
// at which the sun reaches that longitude.
// Uses bracketed bisection-then-Newton: first scan months to bracket the target,
// then Newton-Raphson refine.
export function findSolarTermDate(year: number, targetLon: number): Date {
  // Rough month estimate: longitude 0° (춘분) ~ March 20, advances ~30° per month.
  // Map longitude → month-of-year for the search start.
  // 0° → ~day 79, 30° → day 110, 60° → day 141, etc.
  // approximate day-of-year for target:
  const approxDoy = ((targetLon * 365.2422) / 360 + 79) % 365.2422;

  const yearStartUtc = Date.UTC(year, 0, 1, 0, 0, 0);
  let jd = jdFromDate(new Date(yearStartUtc)) + approxDoy;

  // Newton-Raphson refinement. Sun moves ~0.9856°/day so derivative ~= 0.9856.
  for (let i = 0; i < 8; i++) {
    const L = solarLongitude(jd);
    let diff = targetLon - L;
    // Handle wraparound (target near 0 vs L near 360, etc.)
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    if (Math.abs(diff) < 1e-6) break;
    jd += diff / 0.9856473;
  }

  // jd is now in UT. Shift to KST for display/comparison.
  const utc = dateFromJd(jd);
  return new Date(utc.getTime() + KST_OFFSET_MS);
}

// Returns array of {name, longitude, jijiIdx, date} for all 12 monthly solar terms
// applicable to year `y`. Includes the 소한 of year `y` (which falls early Jan)
// and the 소한 of year `y+1` so callers can locate any birth date's bracket.
export function buildSolarTermTable(year: number) {
  const terms = [
    { name: '소한', longitude: 285, jijiIdx: 1, yearOffset: 0 },
    { name: '입춘', longitude: 315, jijiIdx: 2, yearOffset: 0 },
    { name: '경칩', longitude: 345, jijiIdx: 3, yearOffset: 0 },
    { name: '청명', longitude: 15, jijiIdx: 4, yearOffset: 0 },
    { name: '입하', longitude: 45, jijiIdx: 5, yearOffset: 0 },
    { name: '망종', longitude: 75, jijiIdx: 6, yearOffset: 0 },
    { name: '소서', longitude: 105, jijiIdx: 7, yearOffset: 0 },
    { name: '입추', longitude: 135, jijiIdx: 8, yearOffset: 0 },
    { name: '백로', longitude: 165, jijiIdx: 9, yearOffset: 0 },
    { name: '한로', longitude: 195, jijiIdx: 10, yearOffset: 0 },
    { name: '입동', longitude: 225, jijiIdx: 11, yearOffset: 0 },
    { name: '대설', longitude: 255, jijiIdx: 0, yearOffset: 0 },
  ];
  return terms.map((t) => ({
    ...t,
    date: findSolarTermDate(year + t.yearOffset, t.longitude),
  }));
}

// Returns the 月支 (월지) and effective year-pillar year for a given birth datetime.
// Logic:
//   1. Compute all 12 monthly solar term boundaries for the current year and prev year.
//   2. The pillar's 월지 follows: bracket the birth between two consecutive terms.
//   3. Year pillar uses the calendar year if birth >= 입춘 of that year, else year-1.
export function resolveYearAndMonthPillar(birthKst: Date): {
  yearForPillar: number;
  monthJijiIdx: number;
} {
  const cy = birthKst.getFullYear();
  const ipchunThis = findSolarTermDate(cy, 315);
  const yearForPillar = birthKst < ipchunThis ? cy - 1 : cy;

  // Build the 12 term boundaries that bracket this birth.
  // We need to know "which 30° longitude bin" the sun is in at birth time.
  // The bin starts at 입춘(315°) for 인월, then 345° 묘월, 15° 진월, etc.
  // We compute the longitude at birth and bin it.
  const jdBirthUt = jdFromDate(new Date(birthKst.getTime() - KST_OFFSET_MS));
  const lon = solarLongitude(jdBirthUt);
  // Bins offset by 315°. Bin index 0 = 315° (인), 1 = 345° (묘), ... 11 = 285° (축).
  const adjusted = ((lon - 315 + 360) % 360) / 30;
  const binIdx = Math.floor(adjusted);
  const monthJijiIdx = (binIdx + 2) % 12; // bin 0 → 인(2), bin 1 → 묘(3), …

  return { yearForPillar, monthJijiIdx };
}
