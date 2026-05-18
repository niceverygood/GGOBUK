import { INTERPRETATION_CATEGORIES } from '@/lib/llm/interpret';
import type { SajuResult } from '@/lib/saju/types';
import type { InterpretationCategory } from '@/types/db';

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';

const OHAENG_DESIGN: Record<
  keyof SajuResult['ohaengCount'],
  { color: string; symbol: string; motif: string }
> = {
  목: {
    color: 'fresh jade green',
    symbol: 'sprouting branches',
    motif: 'growth and recovery',
  },
  화: {
    color: 'warm vermilion red',
    symbol: 'soft flame petals',
    motif: 'confidence and warmth',
  },
  토: {
    color: 'golden ochre',
    symbol: 'square earth seals',
    motif: 'stability and grounding',
  },
  금: {
    color: 'pearl white and muted silver',
    symbol: 'clean metal arcs',
    motif: 'clarity and boundaries',
  },
  수: {
    color: 'deep navy ink',
    symbol: 'flowing wave marks',
    motif: 'rest and intuition',
  },
};

function strongestOhaeng(saju: SajuResult) {
  return Object.entries(saju.ohaengCount).sort((a, b) => b[1] - a[1])[0] as [
    keyof SajuResult['ohaengCount'],
    number,
  ];
}

function weakestOhaeng(saju: SajuResult) {
  return Object.entries(saju.ohaengCount).sort((a, b) => a[1] - b[1])[0] as [
    keyof SajuResult['ohaengCount'],
    number,
  ];
}

function categoryTitle(category: InterpretationCategory) {
  return (
    INTERPRETATION_CATEGORIES.find((item) => item.key === category)?.title ??
    '사주'
  );
}

function categoryIntent(category: InterpretationCategory) {
  const map: Partial<Record<InterpretationCategory, string>> = {
    overview: 'overall life balance, self-trust, and long-term clarity',
    ohaeng: 'five-element balance, missing energy support, and daily harmony',
    ilju: 'core identity, self-esteem, and calm decision-making',
    strength: 'turning natural talents into visible confidence',
    weakness: 'protecting the user from repeating weak patterns',
    personality: 'emotional steadiness and kinder self-expression',
    career: 'career focus, right timing, and practical momentum',
    wealth: 'money retention, stable income flow, and wise spending',
    love: 'healthy love, warm communication, and lasting relationship luck',
    family: 'family boundaries, care, and peaceful responsibility',
    friends: 'supportive relationships and better social energy',
    direction: 'auspicious direction, space, color, and daily ritual',
  };
  return map[category] ?? map.overview!;
}

function buildPrompt({
  saju,
  category,
  name,
}: {
  saju: SajuResult;
  category: InterpretationCategory;
  name?: string;
}) {
  const title = categoryTitle(category);
  const [strong, strongCount] = strongestOhaeng(saju);
  const [weak, weakCount] = weakestOhaeng(saju);
  const strongDesign = OHAENG_DESIGN[strong];
  const weakDesign = OHAENG_DESIGN[weak];
  const { palja } = saju;
  const timePillar = palja.time
    ? `${palja.time.ganHanja}${palja.time.jiHanja}`
    : 'unknown time pillar';
  const displayName = name?.trim() ? `${name.trim()}'s` : 'the user’s';

  return `Create a premium vertical Korean folk talisman-inspired digital illustration for a mobile fortune app named "GGOBUK".

Purpose:
- This is an original "mind talisman" artwork for entertainment and self-reflection, not a medical, legal, religious, or guaranteed supernatural object.
- Theme: ${displayName} ${title} talisman.
- Intent: ${categoryIntent(category)}.

Birth chart design data:
- Four pillars: year ${palja.year.ganHanja}${palja.year.jiHanja}, month ${palja.month.ganHanja}${palja.month.jiHanja}, day ${palja.day.ganHanja}${palja.day.jiHanja}, time ${timePillar}.
- Day master: ${saju.ilgan}.
- Strongest five-element energy: ${strong} (${strongCount}), express it with ${strongDesign.color}, ${strongDesign.symbol}, ${strongDesign.motif}.
- Weakest five-element energy: ${weak} (${weakCount}), gently supplement it with ${weakDesign.color}, ${weakDesign.symbol}, ${weakDesign.motif}.

Art direction:
- Warm ivory hanji paper texture, subtle fibers, premium app-store quality.
- Centerpiece: cute but refined turtle-shell seal, inspired by GGOBUK's turtle character, with an oval shell geometry and five-element color accents.
- Use balanced talisman strokes, abstract seal marks, cloud and wave motifs, tiny gold dust, and hand-drawn ink lines.
- Keep it soft, protective, hopeful, and collectible. No horror, no dark occult mood.
- Avoid readable small text and avoid imitating real sacred scripts. Use abstract glyph-like decorative strokes instead.
- Clean composition with generous margins, crisp edges, high-resolution, suitable for saving as a phone wallpaper.
- No logos, no watermark, no photorealistic people, no UI mockup, no frame border.`;
}

export class TalismanImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TalismanImageError';
  }
}

export async function generateTalismanImage(params: {
  saju: SajuResult;
  category: InterpretationCategory;
  name?: string;
}): Promise<{
  imageDataUrl: string;
  model: string;
  title: string;
  format: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new TalismanImageError('openai_not_configured');

  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-2';
  const size = process.env.OPENAI_IMAGE_SIZE?.trim() || '1024x1536';
  const format = process.env.OPENAI_IMAGE_FORMAT?.trim() || 'png';

  const res = await fetch(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: buildPrompt(params),
      n: 1,
      size,
      output_format: format,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : `OpenAI image request failed: ${res.status}`;
    throw new TalismanImageError(message);
  }

  const b64 =
    typeof data?.data?.[0]?.b64_json === 'string' ? data.data[0].b64_json : '';
  if (!b64) throw new TalismanImageError('openai_image_empty');

  return {
    imageDataUrl: `data:image/${format};base64,${b64}`,
    model,
    title: `${categoryTitle(params.category)} 마음부적`,
    format,
  };
}
