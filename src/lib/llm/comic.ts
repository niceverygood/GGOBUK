import { INTERPRETATION_CATEGORIES } from '@/lib/llm/interpret';
import type { SajuResult } from '@/lib/saju/types';
import type { InterpretationCategory } from '@/types/db';

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
const DEFAULT_COMIC_IMAGE_MODEL = 'gpt-image-2';
const PROMPT_VERSION = 'comic-v1';

export class ComicImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComicImageError';
  }
}

const OHAENG_DESIGN: Record<
  keyof SajuResult['ohaengCount'],
  { color: string; motif: string }
> = {
  목: { color: 'fresh jade green', motif: 'sprouts, trees, and upward growth' },
  화: { color: 'warm coral red', motif: 'soft flames, lanterns, and sunlight' },
  토: { color: 'golden ochre', motif: 'earth tiles, mountains, and stability' },
  금: { color: 'pearl white and muted silver', motif: 'clean arcs, metal bells, and clarity' },
  수: { color: 'deep navy blue', motif: 'waves, moonlit water, and quiet intuition' },
};

function categoryTitle(category: InterpretationCategory) {
  return (
    INTERPRETATION_CATEGORIES.find((item) => item.key === category)?.title ??
    '사주풀이'
  );
}

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

function pillarLabel(saju: SajuResult) {
  const { year, month, day, time } = saju.palja;
  return [
    `year ${year.gan}${year.ji}`,
    `month ${month.gan}${month.ji}`,
    `day ${day.gan}${day.ji}`,
    time ? `hour ${time.gan}${time.ji}` : 'unknown birth hour',
  ].join(', ');
}

function compactInterpretation(content: string) {
  return content
    .replace(/\|[-:\s|]+\|/g, ' ')
    .replace(/[#*_>`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1400);
}

function buildPrompt(params: {
  saju: SajuResult;
  category: InterpretationCategory;
  name?: string;
  content: string;
}) {
  const [strongest] = strongestOhaeng(params.saju);
  const [weakest] = weakestOhaeng(params.saju);
  const strongDesign = OHAENG_DESIGN[strongest];
  const weakDesign = OHAENG_DESIGN[weakest];
  const title = categoryTitle(params.category);
  const nameLine = params.name ? `Main human user nickname: ${params.name}.` : '';
  const excerpt = compactInterpretation(params.content);

  return `Create one polished vertical Korean webtoon-style illustration as a single 4-panel image.

Core mascot:
- The mascot is "Kkobuk", a cute pastel mint turtle fortune guide.
- Kkobuk has a large round mint head, glossy oval black eyes, peach cheek circles, a cream belly, a teal shell, and thick clean navy outlines.
- Keep Kkobuk recognizably the same mascot in every panel. Do not make it a realistic turtle, dinosaur, frog, or human.

Image format and composition:
- One tall vertical image, 4 stacked webtoon panels, aspect ratio 2:3.
- Soft rounded panel gutters, ivory paper background, mint/navy/gold palette.
- Friendly Korean mobile app illustration quality, high resolution, clean line art, warm but not childish.
- No dense text. Do not generate readable Korean sentences, random letters, logos, watermarks, UI screenshots, or QR codes.
- Speech bubbles may be empty or use only tiny icon marks. Use visual storytelling instead of text.

Saju reading context:
- Reading topic: ${title}.
- Four pillars: ${pillarLabel(params.saju)}.
- Day master: ${params.saju.ilgan}${params.saju.ilgi}.
- Strongest five-element energy: ${strongest}, shown with ${strongDesign.color}, ${strongDesign.motif}.
- Weakest five-element energy: ${weakest}, supported with ${weakDesign.color}, ${weakDesign.motif}.
${nameLine}
- Interpretation summary to visualize: ${excerpt || 'balanced self-understanding, practical choices, and a hopeful next step.'}

Panel directions:
1. Kkobuk opens a round saju board with four abstract pillar tiles and glowing orbit lines.
2. Kkobuk points to the strongest and weakest element motifs, showing contrast and balance.
3. Show the user's real-life theme from the interpretation as a symbolic everyday scene, gentle and relatable.
4. Kkobuk gives a hopeful practical nudge, with a small path forward and warm light.

Mood:
- Comforting, wise, slightly magical, premium app-store quality.
- Avoid horror, religious ritual intensity, fortune-teller clichés, scary talismans, clutter, photorealism, messy anatomy, extra limbs, or off-model mascot changes.

Prompt version: ${PROMPT_VERSION}.`;
}

async function imageUrlToDataUrl(url: string, fallbackFormat: string) {
  const imageRes = await fetch(url);
  if (!imageRes.ok)
    throw new ComicImageError(`OpenAI image URL fetch failed: ${imageRes.status}`);

  const contentType = imageRes.headers.get('content-type') || `image/${fallbackFormat}`;
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

export async function generateInterpretationComic(params: {
  saju: SajuResult;
  category: InterpretationCategory;
  name?: string;
  content: string;
}): Promise<{
  imageDataUrl: string;
  model: string;
  title: string;
  format: string;
  promptVersion: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new ComicImageError('openai_not_configured');

  const model =
    process.env.OPENAI_COMIC_IMAGE_MODEL?.trim() || DEFAULT_COMIC_IMAGE_MODEL;
  const size = process.env.OPENAI_COMIC_IMAGE_SIZE?.trim() || '1024x1536';
  const format = process.env.OPENAI_COMIC_IMAGE_FORMAT?.trim() || 'png';

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
    throw new ComicImageError(message);
  }

  const b64 =
    typeof data?.data?.[0]?.b64_json === 'string' ? data.data[0].b64_json : '';
  const imageUrl =
    typeof data?.data?.[0]?.url === 'string' ? data.data[0].url : '';

  const imageDataUrl = b64
    ? `data:image/${format};base64,${b64}`
    : imageUrl
      ? await imageUrlToDataUrl(imageUrl, format)
      : '';

  if (!imageDataUrl) throw new ComicImageError('openai_image_empty');

  return {
    imageDataUrl,
    model,
    title: `${categoryTitle(params.category)} 꼬북 웹툰`,
    format,
    promptVersion: PROMPT_VERSION,
  };
}
