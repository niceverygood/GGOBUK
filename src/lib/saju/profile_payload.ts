import { buildSajuResult } from '@/lib/saju';

export interface SajuProfilePayloadInput {
  name: string;
  birthDate: string;
  birthTime?: string | null;
  isLunar: boolean;
  isLeapMonth?: boolean | null;
  gender: 'M' | 'F';
  relationType: 'self' | 'family' | 'friend' | 'lover' | 'colleague' | 'other';
  relationLabel?: string | null;
}

export function buildSajuProfilePayload(input: SajuProfilePayloadInput) {
  const saju = buildSajuResult({
    birthDate: input.birthDate,
    birthTime: input.birthTime ?? undefined,
    isLunar: input.isLunar,
    isLeapMonth: input.isLeapMonth ?? false,
    gender: input.gender,
  });

  return {
    name: input.name.trim(),
    birth_date: input.birthDate,
    birth_time: input.birthTime || null,
    is_lunar: input.isLunar,
    is_leap_month: input.isLeapMonth ?? false,
    gender: input.gender,
    relation_type: input.relationType,
    relation_label: input.relationLabel?.trim() || null,
    palja: saju.palja,
    ohaeng_count: saju.ohaengCount,
    sipsung: saju.sipsung,
    sinsal: saju.sinsal,
    daewoon: saju.daewoon,
    ilgan: saju.ilgan,
  };
}
