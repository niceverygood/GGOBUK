import { INTERPRETATION_CATEGORIES } from '@/lib/llm/interpret';
import type { SajuResult } from '@/lib/saju/types';
import type { InterpretationCategory } from '@/types/db';

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
const DEFAULT_IMAGE_MODEL = 'gpt-image-2';
const FALLBACK_IMAGE_MODELS = [
  'gpt-image-1.5',
  'gpt-image-1',
  'gpt-image-1-mini',
];

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

const OHAENG_SVG_COLORS: Record<
  keyof SajuResult['ohaengCount'],
  { fill: string; soft: string; stroke: string }
> = {
  목: { fill: '#56B870', soft: '#DDF4E4', stroke: '#27825C' },
  화: { fill: '#EF4E42', soft: '#FFE3DD', stroke: '#B93832' },
  토: { fill: '#F4D03F', soft: '#FFF4BF', stroke: '#B99B21' },
  금: { fill: '#F8F4E8', soft: '#FFFDF5', stroke: '#A8B0B7' },
  수: { fill: '#2C3E50', soft: '#DCE8F2', stroke: '#1B2A38' },
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

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => {
    const map: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&apos;',
    };
    return map[char] ?? char;
  });
}

function fallbackTalismanImage(params: {
  saju: SajuResult;
  category: InterpretationCategory;
  name?: string;
}) {
  const title = `${categoryTitle(params.category)} 마음부적`;
  const [strong] = strongestOhaeng(params.saju);
  const [weak] = weakestOhaeng(params.saju);
  const strongColor = OHAENG_SVG_COLORS[strong];
  const weakColor = OHAENG_SVG_COLORS[weak];
  const { palja } = params.saju;
  const pillars = [
    palja.year,
    palja.month,
    palja.day,
    palja.time,
  ].filter(Boolean);
  const name = params.name?.trim() || '꼬북';
  const shellCells = pillars
    .map((pillar, index) => {
      const x = 244 + (index % 2) * 190;
      const y = 505 + Math.floor(index / 2) * 176;
      return `<rect x="${x}" y="${y}" width="152" height="132" rx="38" fill="#FFFDF4" stroke="${strongColor.stroke}" stroke-width="5" opacity="0.96"/>
        <text x="${x + 76}" y="${y + 58}" text-anchor="middle" font-size="42" font-weight="800" fill="#24384B">${escapeXml(
          `${pillar!.ganHanja}${pillar!.jiHanja}`,
        )}</text>
        <text x="${x + 76}" y="${y + 94}" text-anchor="middle" font-size="22" font-weight="800" fill="#7A7164">${escapeXml(
          `${pillar!.gan} · ${pillar!.ji}`,
        )}</text>`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">
    <defs>
      <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FFF9E9"/>
        <stop offset="0.52" stop-color="#FFFDF8"/>
        <stop offset="1" stop-color="${weakColor.soft}"/>
      </linearGradient>
      <radialGradient id="aura" cx="50%" cy="40%" r="60%">
        <stop offset="0" stop-color="${weakColor.soft}" stop-opacity="0.92"/>
        <stop offset="0.5" stop-color="#FFF8D8" stop-opacity="0.72"/>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#26384A" flood-opacity="0.14"/>
      </filter>
      <pattern id="fiber" width="64" height="64" patternUnits="userSpaceOnUse">
        <path d="M8 12h18M34 28h22M16 49h28" stroke="#E5D7B8" stroke-width="2" opacity="0.28" stroke-linecap="round"/>
      </pattern>
    </defs>
    <rect width="1024" height="1536" fill="url(#paper)"/>
    <rect width="1024" height="1536" fill="url(#fiber)" opacity="0.75"/>
    <circle cx="512" cy="560" r="420" fill="url(#aura)"/>
    <text x="512" y="165" text-anchor="middle" font-size="42" font-weight="900" fill="#2C3E50">꼬북점 마음부적</text>
    <text x="512" y="217" text-anchor="middle" font-size="24" font-weight="800" fill="#8A7F6C">${escapeXml(
      name,
    )} · ${escapeXml(title)}</text>
    <g filter="url(#shadow)">
      <rect x="144" y="282" width="736" height="958" rx="72" fill="#FFFDF7" stroke="#E9D597" stroke-width="6"/>
      <rect x="178" y="316" width="668" height="890" rx="54" fill="none" stroke="${weakColor.stroke}" stroke-width="3" stroke-dasharray="12 14" opacity="0.5"/>
      <ellipse cx="512" cy="612" rx="276" ry="250" fill="${weakColor.soft}" stroke="${strongColor.stroke}" stroke-width="10"/>
      <path d="M274 528C348 392 676 392 750 528C672 460 352 460 274 528Z" fill="${strongColor.fill}" opacity="0.22"/>
      <path d="M270 698C348 820 676 820 754 698C658 768 366 768 270 698Z" fill="${strongColor.fill}" opacity="0.18"/>
      ${shellCells}
      <circle cx="512" cy="362" r="72" fill="${strongColor.fill}" stroke="#2C3E50" stroke-width="7"/>
      <path d="M478 366c20 28 48 28 68 0M486 342h1M538 342h1" stroke="#2C3E50" stroke-width="10" stroke-linecap="round" fill="none"/>
      <path d="M360 930c72-92 232-92 304 0M318 988c120 72 268 72 388 0" stroke="${strongColor.stroke}" stroke-width="14" stroke-linecap="round" fill="none" opacity="0.74"/>
      <text x="512" y="1048" text-anchor="middle" font-size="64" font-weight="900" fill="#2C3E50">${escapeXml(
        params.saju.ilgan,
      )}</text>
      <text x="512" y="1094" text-anchor="middle" font-size="24" font-weight="900" fill="#8A7F6C">강한 ${strong} · 보완 ${weak}</text>
      <g opacity="0.84">
        <circle cx="262" cy="382" r="16" fill="${weakColor.fill}"/>
        <circle cx="760" cy="382" r="16" fill="${strongColor.fill}"/>
        <path d="M224 432c-38 34-36 92 6 122M798 432c38 34 36 92-6 122" stroke="#E6B73E" stroke-width="10" stroke-linecap="round" fill="none"/>
        <path d="M246 1160h532" stroke="#F0D46A" stroke-width="16" stroke-linecap="round"/>
      </g>
    </g>
    <text x="512" y="1325" text-anchor="middle" font-size="26" font-weight="900" fill="#2C3E50">오늘의 마음을 지켜주는 작은 의식</text>
    <text x="512" y="1370" text-anchor="middle" font-size="20" font-weight="800" fill="#8A7F6C">자기성찰과 재미를 위한 꼬북점 오행 부적</text>
  </svg>`;

  return {
    imageDataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString(
      'base64',
    )}`,
    model: 'ggobuk-local-talisman',
    title,
    format: 'svg',
  };
}

function imageModelCandidates() {
  const configured = process.env.OPENAI_IMAGE_MODEL?.trim();
  return Array.from(
    new Set([
      configured || DEFAULT_IMAGE_MODEL,
      DEFAULT_IMAGE_MODEL,
      ...FALLBACK_IMAGE_MODELS,
    ]),
  );
}

function shouldRetryWithFallback(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    message.includes('model') ||
    message.includes('does not exist') ||
    message.includes('not found') ||
    message.includes('unsupported') ||
    message.includes('invalid')
  );
}

async function imageUrlToDataUrl(url: string, fallbackFormat: string) {
  const imageRes = await fetch(url);
  if (!imageRes.ok)
    throw new TalismanImageError(`OpenAI image URL fetch failed: ${imageRes.status}`);

  const contentType =
    imageRes.headers.get('content-type') || `image/${fallbackFormat}`;
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

async function requestTalismanImage({
  apiKey,
  model,
  size,
  format,
  params,
}: {
  apiKey: string;
  model: string;
  size: string;
  format: string;
  params: {
    saju: SajuResult;
    category: InterpretationCategory;
    name?: string;
  };
}) {
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
  if (b64) return `data:image/${format};base64,${b64}`;

  const imageUrl =
    typeof data?.data?.[0]?.url === 'string' ? data.data[0].url : '';
  if (imageUrl) return imageUrlToDataUrl(imageUrl, format);

  throw new TalismanImageError('openai_image_empty');
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
  if (!apiKey) return fallbackTalismanImage(params);

  const size = process.env.OPENAI_IMAGE_SIZE?.trim() || '1024x1536';
  const format = process.env.OPENAI_IMAGE_FORMAT?.trim() || 'png';
  let lastError: unknown;

  for (const model of imageModelCandidates()) {
    try {
      const imageDataUrl = await requestTalismanImage({
        apiKey,
        model,
        size,
        format,
        params,
      });

      return {
        imageDataUrl,
        model,
        title: `${categoryTitle(params.category)} 마음부적`,
        format,
      };
    } catch (error) {
      lastError = error;
      if (!shouldRetryWithFallback(error)) break;
    }
  }

  console.error('[talisman] OpenAI image failed; using local fallback', {
    category: params.category,
    message: lastError instanceof Error ? lastError.message : String(lastError),
  });
  return fallbackTalismanImage(params);
}
