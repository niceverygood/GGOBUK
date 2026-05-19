import { INTERPRETATION_CATEGORIES } from "@/lib/llm/interpret";
import type { SajuResult } from "@/lib/saju/types";
import type { InterpretationCategory } from "@/types/db";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_IMAGE_MODEL = "gpt-image-2";
const FALLBACK_IMAGE_MODELS = [
  "gpt-image-1.5",
  "gpt-image-1",
  "gpt-image-1-mini",
];

const OHAENG_DESIGN: Record<
  keyof SajuResult["ohaengCount"],
  { color: string; symbol: string; motif: string }
> = {
  목: {
    color: "fresh jade green",
    symbol: "sprouting branches",
    motif: "growth and recovery",
  },
  화: {
    color: "warm vermilion red",
    symbol: "soft flame petals",
    motif: "confidence and warmth",
  },
  토: {
    color: "golden ochre",
    symbol: "square earth seals",
    motif: "stability and grounding",
  },
  금: {
    color: "pearl white and muted silver",
    symbol: "clean metal arcs",
    motif: "clarity and boundaries",
  },
  수: {
    color: "deep navy ink",
    symbol: "flowing wave marks",
    motif: "rest and intuition",
  },
};

const OHAENG_HANJA: Record<keyof SajuResult["ohaengCount"], string> = {
  목: "木",
  화: "火",
  토: "土",
  금: "金",
  수: "水",
};

function strongestOhaeng(saju: SajuResult) {
  return Object.entries(saju.ohaengCount).sort((a, b) => b[1] - a[1])[0] as [
    keyof SajuResult["ohaengCount"],
    number,
  ];
}

function weakestOhaeng(saju: SajuResult) {
  return Object.entries(saju.ohaengCount).sort((a, b) => a[1] - b[1])[0] as [
    keyof SajuResult["ohaengCount"],
    number,
  ];
}

function categoryTitle(category: InterpretationCategory) {
  return (
    INTERPRETATION_CATEGORIES.find((item) => item.key === category)?.title ??
    "사주"
  );
}

function categoryIntent(category: InterpretationCategory) {
  const map: Partial<Record<InterpretationCategory, string>> = {
    overview: "overall life balance, self-trust, and long-term clarity",
    ohaeng: "five-element balance, missing energy support, and daily harmony",
    ilju: "core identity, self-esteem, and calm decision-making",
    strength: "turning natural talents into visible confidence",
    weakness: "protecting the user from repeating weak patterns",
    personality: "emotional steadiness and kinder self-expression",
    career: "career focus, right timing, and practical momentum",
    wealth: "money retention, stable income flow, and wise spending",
    love: "healthy love, warm communication, and lasting relationship luck",
    family: "family boundaries, care, and peaceful responsibility",
    friends: "supportive relationships and better social energy",
    direction: "auspicious direction, space, color, and daily ritual",
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
    : "unknown time pillar";
  const displayName = name?.trim() ? `${name.trim()}'s` : "the user’s";

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
- Authentic Korean talisman-inspired composition: yellow hanji paper, cinnabar-red ink, hand-brushed vertical spell-like strokes, dense seal geometry, old paper fibers.
- It should feel like a premium fortune talisman, not a cute character card, not a sticker, not a UI mockup.
- Hide GGOBUK's turtle identity inside an abstract turtle-shell seal geometry, not as a smiling mascot.
- Use ritual-looking border rules, circular stamps, square seals, vertical flow lines, and five-element knots. Add subtle ink bleed, uneven brush pressure, and stamped texture.
- Keep it protective, hopeful, collectible, and aesthetically refined. No horror, no dark occult mood.
- Avoid copying real religious scriptures. Use original abstract glyph-like decorative strokes inspired by talisman calligraphy.
- Clean professional composition with generous margins, high-resolution, suitable for saving as a phone wallpaper.
- No logos, no watermark, no photorealistic people, no UI mockup.`;
}

export class TalismanImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TalismanImageError";
  }
}

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (char) => {
    const map: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&apos;",
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
  const { palja } = params.saju;
  const pillars = [palja.year, palja.month, palja.day, palja.time].filter(
    Boolean,
  );
  const name = params.name?.trim() || "꼬북점";
  const sealLabels = ["年命", "月令", "日主", "時門"];
  const pillarSeals = pillars
    .map((pillar, index) => {
      const x = 256 + (index % 2) * 256;
      const y = 388 + Math.floor(index / 2) * 132;
      return `<g opacity="0.92">
        <rect x="${x}" y="${y}" width="172" height="94" rx="12" fill="none" stroke="#B51E18" stroke-width="5"/>
        <rect x="${x + 12}" y="${y + 12}" width="148" height="70" rx="6" fill="none" stroke="#B51E18" stroke-width="2" opacity="0.38"/>
        <text x="${x + 86}" y="${y + 43}" text-anchor="middle" font-size="34" font-weight="900" fill="#A81914">${escapeXml(
          `${pillar!.ganHanja}${pillar!.jiHanja}`,
        )}</text>
        <text x="${x + 86}" y="${y + 70}" text-anchor="middle" font-size="16" font-weight="900" fill="#87342E">${sealLabels[index] ?? "命印"}</text>
      </g>`;
    })
    .join("");
  const elementMarks = (
    Object.keys(params.saju.ohaengCount) as Array<
      keyof SajuResult["ohaengCount"]
    >
  )
    .map((element, index) => {
      const count = params.saju.ohaengCount[element];
      const x = 250 + index * 132;
      const dots = Array.from({ length: Math.max(1, count) })
        .map((_, dotIndex) => {
          const dx = x - (Math.max(1, count) - 1) * 8 + dotIndex * 16;
          return `<circle cx="${dx}" cy="1230" r="4" fill="#A81914" opacity="0.72"/>`;
        })
        .join("");
      return `<g>
        <circle cx="${x}" cy="1184" r="32" fill="none" stroke="#A81914" stroke-width="5"/>
        <circle cx="${x}" cy="1184" r="22" fill="none" stroke="#A81914" stroke-width="2" opacity="0.45"/>
        <text x="${x}" y="1195" text-anchor="middle" font-size="34" font-weight="900" fill="#A81914">${OHAENG_HANJA[element]}</text>
        ${dots}
      </g>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">
    <defs>
      <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#F9D75A"/>
        <stop offset="0.48" stop-color="#F7C842"/>
        <stop offset="1" stop-color="#EAB93A"/>
      </linearGradient>
      <radialGradient id="centerGlow" cx="50%" cy="43%" r="62%">
        <stop offset="0" stop-color="#FFF1A7" stop-opacity="0.9"/>
        <stop offset="0.62" stop-color="#F7C842" stop-opacity="0.25"/>
        <stop offset="1" stop-color="#B51E18" stop-opacity="0"/>
      </radialGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#26384A" flood-opacity="0.14"/>
      </filter>
      <filter id="inkBleed" x="-8%" y="-8%" width="116%" height="116%">
        <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" seed="7"/>
        <feDisplacementMap in="SourceGraphic" scale="2.4"/>
      </filter>
      <pattern id="fiber" width="52" height="52" patternUnits="userSpaceOnUse">
        <path d="M5 9h20M31 22h16M12 39h30" stroke="#C89A2A" stroke-width="1.6" opacity="0.28" stroke-linecap="round"/>
        <circle cx="44" cy="10" r="1.8" fill="#A87520" opacity="0.16"/>
      </pattern>
    </defs>
    <rect width="1024" height="1536" fill="#8F1D18"/>
    <g filter="url(#shadow)">
      <rect x="82" y="70" width="860" height="1396" rx="24" fill="url(#paper)"/>
      <rect x="82" y="70" width="860" height="1396" rx="24" fill="url(#fiber)" opacity="0.82"/>
      <rect x="114" y="106" width="796" height="1324" rx="12" fill="none" stroke="#B51E18" stroke-width="12"/>
      <rect x="146" y="144" width="732" height="1248" rx="4" fill="none" stroke="#B51E18" stroke-width="4" stroke-dasharray="26 18" opacity="0.58"/>
      <circle cx="512" cy="650" r="385" fill="url(#centerGlow)"/>
    </g>

    <g filter="url(#inkBleed)" fill="none" stroke="#A81914" stroke-linecap="round" stroke-linejoin="round">
      <path d="M208 244C294 202 398 198 512 230C626 198 730 202 816 244" stroke-width="8"/>
      <path d="M218 300C326 268 442 278 512 330C582 278 698 268 806 300" stroke-width="5" opacity="0.8"/>
      <path d="M186 1296C318 1250 706 1250 838 1296" stroke-width="8"/>
      <path d="M220 1342C362 1370 662 1370 804 1342" stroke-width="5" opacity="0.76"/>
    </g>

    <text x="512" y="202" text-anchor="middle" font-size="66" font-weight="900" fill="#9F1914" letter-spacing="8">龜卜五行符</text>
    <text x="512" y="262" text-anchor="middle" font-size="24" font-weight="900" fill="#7D221E">守心開運 · 調氣安命</text>

    <g filter="url(#inkBleed)">
      <circle cx="260" cy="318" r="42" fill="none" stroke="#B51E18" stroke-width="8"/>
      <path d="M240 318h40M260 296v44M238 296l44 44M282 296l-44 44" stroke="#B51E18" stroke-width="4" stroke-linecap="round"/>
      <circle cx="764" cy="318" r="42" fill="none" stroke="#B51E18" stroke-width="8"/>
      <path d="M744 318h40M764 296v44M742 296l44 44M786 296l-44 44" stroke="#B51E18" stroke-width="4" stroke-linecap="round"/>
      <rect x="452" y="296" width="120" height="82" rx="6" fill="none" stroke="#B51E18" stroke-width="7"/>
      <text x="512" y="352" text-anchor="middle" font-size="48" font-weight="900" fill="#A81914">${escapeXml(
        params.saju.ilgan,
      )}</text>
    </g>

    ${pillarSeals}

    <g filter="url(#inkBleed)" fill="none" stroke="#A81914" stroke-linecap="round" stroke-linejoin="round">
      <path d="M512 575C414 628 356 700 346 790C336 902 426 980 512 1022C598 980 688 902 678 790C668 700 610 628 512 575Z" stroke-width="14"/>
      <path d="M512 610v388M420 690c54 44 130 44 184 0M396 775c76 58 156 58 232 0M410 876c72 50 132 50 204 0" stroke-width="8" opacity="0.82"/>
      <path d="M512 610c-42 64-56 118-44 164C478 812 494 854 512 902C530 854 546 812 556 774C568 728 554 674 512 610Z" stroke-width="7" opacity="0.78"/>
      <path d="M330 670c-86 62-96 164-42 236M694 670c86 62 96 164 42 236" stroke-width="10"/>
      <path d="M292 1016c102 84 338 84 440 0M326 1068c88 54 284 54 372 0" stroke-width="9"/>
      <path d="M250 582c42 40 68 84 76 132M774 582c-42 40-68 84-76 132" stroke-width="7" opacity="0.72"/>
      <path d="M232 828h104M688 828h104M280 928h74M670 928h74" stroke-width="7" opacity="0.72"/>
    </g>

    <g filter="url(#inkBleed)" fill="#B51E18" opacity="0.9">
      <circle cx="208" cy="534" r="10"/>
      <circle cx="816" cy="534" r="10"/>
      <circle cx="218" cy="1120" r="9"/>
      <circle cx="806" cy="1120" r="9"/>
      <rect x="188" y="615" width="46" height="10" rx="5"/>
      <rect x="790" y="615" width="46" height="10" rx="5"/>
      <rect x="188" y="1012" width="46" height="10" rx="5"/>
      <rect x="790" y="1012" width="46" height="10" rx="5"/>
    </g>

    <g filter="url(#inkBleed)">
      ${elementMarks}
      <text x="512" y="1288" text-anchor="middle" font-size="28" font-weight="900" fill="#7D221E">${OHAENG_HANJA[strong]}旺 · ${OHAENG_HANJA[weak]}補 · ${escapeXml(name)}</text>
      <path d="M304 1316h416" stroke="#A81914" stroke-width="6" stroke-linecap="round" opacity="0.72"/>
    </g>

    <g opacity="0.32" fill="#7D221E">
      <text x="190" y="770" text-anchor="middle" font-size="34" font-weight="900" writing-mode="tb">木火土金水</text>
      <text x="834" y="770" text-anchor="middle" font-size="34" font-weight="900" writing-mode="tb">守心開運安</text>
    </g>
  </svg>`;

  return {
    imageDataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString(
      "base64",
    )}`,
    model: "ggobuk-local-talisman",
    title,
    format: "svg",
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
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("model") ||
    message.includes("does not exist") ||
    message.includes("not found") ||
    message.includes("unsupported") ||
    message.includes("invalid")
  );
}

async function imageUrlToDataUrl(url: string, fallbackFormat: string) {
  const imageRes = await fetch(url);
  if (!imageRes.ok)
    throw new TalismanImageError(
      `OpenAI image URL fetch failed: ${imageRes.status}`,
    );

  const contentType =
    imageRes.headers.get("content-type") || `image/${fallbackFormat}`;
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
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
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
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
      typeof data?.error?.message === "string"
        ? data.error.message
        : `OpenAI image request failed: ${res.status}`;
    throw new TalismanImageError(message);
  }

  const b64 =
    typeof data?.data?.[0]?.b64_json === "string" ? data.data[0].b64_json : "";
  if (b64) return `data:image/${format};base64,${b64}`;

  const imageUrl =
    typeof data?.data?.[0]?.url === "string" ? data.data[0].url : "";
  if (imageUrl) return imageUrlToDataUrl(imageUrl, format);

  throw new TalismanImageError("openai_image_empty");
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

  const size = process.env.OPENAI_IMAGE_SIZE?.trim() || "1024x1536";
  const format = process.env.OPENAI_IMAGE_FORMAT?.trim() || "png";
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

  console.error("[talisman] OpenAI image failed; using local fallback", {
    category: params.category,
    message: lastError instanceof Error ? lastError.message : String(lastError),
  });
  return fallbackTalismanImage(params);
}
