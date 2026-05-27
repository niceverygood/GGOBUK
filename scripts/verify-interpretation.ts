/**
 * 새 prompt + 카테고리 사전계산 신호 + 충 재발동 시점 자동 계산이 실제 LLM
 * 호출에서 어떻게 풀이로 나오는지 검증하는 스크립트.
 *
 * Usage:
 *   pnpm exec tsx scripts/verify-interpretation.ts <category> <persona>
 *
 * Default: weakness × dosa (검증에 가장 유리 — 새 신호 가장 많이 들어감)
 *
 * Hi 사주(CLAUDE.md): 1985-11-14 14:05 male solar
 *   → 시 丁未 / 일 丁巳 / 월 丁亥 / 연 乙丑
 */

// NOTE: env must be loaded BEFORE any module that captures process.env at
// import time (lib/llm/client.ts does this). So we keep the lib imports
// dynamic and run loadEnvLocal() first.
import type { PersonaKey } from '../src/lib/llm/personas';
import type { InterpretationCategory } from '../src/types/db';

function loadEnvLocal() {
  // Tiny .env.local loader so we don't need dotenv as a dep.
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
    // Strip wrapping quotes.
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

  // Dynamic import AFTER env load so client.ts captures the key.
  const { buildSajuResult } = await import('../src/lib/saju');
  const { generateInterpretation } = await import('../src/lib/llm/interpret');

  const category = (process.argv[2] ?? 'weakness') as InterpretationCategory;
  const persona = (process.argv[3] ?? 'dosa') as PersonaKey;
  const name = 'Hi';

  console.log(`\n=== 검증 풀이 ===`);
  console.log(`사주: 1985-11-14 14:05 male solar`);
  console.log(`카테고리: ${category}`);
  console.log(`페르소나: ${persona}`);
  console.log(`이름: ${name}`);
  console.log(`\n계산 중...`);

  const saju = buildSajuResult({
    birthDate: '1985-11-14',
    birthTime: '14:05',
    isLunar: false,
    gender: 'M',
  });

  console.log(`\n팔자: 연 ${saju.palja.year.ganHanja}${saju.palja.year.jiHanja} / 월 ${saju.palja.month.ganHanja}${saju.palja.month.jiHanja} / 일 ${saju.palja.day.ganHanja}${saju.palja.day.jiHanja} / 시 ${saju.palja.time?.ganHanja ?? '?'}${saju.palja.time?.jiHanja ?? ''}`);

  const t0 = Date.now();
  const result = await generateInterpretation(saju, category, name, undefined, persona);
  const ms = Date.now() - t0;

  console.log(`\n=== 풀이 결과 (${ms}ms · ${result.tokensUsed} tokens · ${result.model}) ===\n`);
  console.log(result.content);
  console.log(`\n=== 끝 ===\n`);
}

main().catch((err) => {
  console.error('verification failed:', err);
  process.exit(1);
});
