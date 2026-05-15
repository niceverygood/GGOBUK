import { findSolarTermDate, solarLongitude } from '../src/lib/saju/solar_terms';

// Check 입춘 timestamps for years used in tests.
for (const y of [1985, 2024, 1990]) {
  const ipchun = findSolarTermDate(y, 315);
  console.log(`${y} 입춘 (KST): ${ipchun.toISOString()}`);
}

// And longitude check at known timestamps.
const jd = (new Date(Date.UTC(2024, 1, 4, 8, 27, 0))).getTime() / 86400000 + 2440587.5;
console.log('Solar longitude at 2024-02-04 17:27 KST (08:27 UTC):', solarLongitude(jd));
