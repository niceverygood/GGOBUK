import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CREDIT_COSTS } from '@/lib/credits';
import {
  addCredits,
  isInsufficientCreditsError,
  spendCredits,
} from '@/lib/credits/server';
import { generateInterpretationComic } from '@/lib/llm/comic';
import { INTERPRETATION_CATEGORIES } from '@/lib/llm/interpret';
import { buildSajuResult } from '@/lib/saju';
import { createServerClient } from '@/lib/supabase/server';
import { hasAiConsent } from '@/lib/privacy/consent';
import { rateLimit, rateLimitKey } from '@/lib/utils/rate-limit';
import { logger } from '@/lib/utils/logger';
import type { InterpretationCategory, Persona, SajuProfileRow } from '@/types/db';

const Body = z.object({
  category: z.string(),
  content: z.string().min(20).max(60000),
  persona: z.enum(['kkobuk', 'dosa', 'mudang', 'bosal']).optional(),
});

export const runtime = 'nodejs';
export const maxDuration = 90;

function errorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'openai_not_configured') return 'openai_not_configured';
  if (message === 'openai_image_empty') return 'openai_image_empty';
  return 'openai_image_failed';
}

function contentHash(content: string) {
  return createHash('sha256')
    .update(content.trim().replace(/\s+/g, ' '))
    .digest('hex')
    .slice(0, 24);
}

function dataUrlToBuffer(dataUrl: string, format: string) {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  return {
    buffer: Buffer.from(match[2], 'base64'),
    contentType: match[1] || `image/${format}`,
  };
}

async function cachedComic(params: {
  sajuId: string;
  category: string;
  persona: Persona;
  hash: string;
}) {
  const admin = await createServerClient({ admin: true });
  const { data, error } = await admin
    .from('interpretation_comics')
    .select('image_url,title,model,format,generated_at')
    .eq('saju_id', params.sajuId)
    .eq('category', params.category)
    .eq('persona', params.persona)
    .eq('content_hash', params.hash)
    .eq('prompt_version', 'comic-v1')
    .maybeSingle();

  if (error) {
    if (!/interpretation_comics|does not exist|schema cache/i.test(error.message)) {
      logger.warn('comics/generate', 'cache read failed', {
        message: error.message,
      });
    }
    return null;
  }
  return data;
}

async function uploadComicImage(params: {
  userId: string;
  sajuId: string;
  category: string;
  persona: Persona;
  hash: string;
  imageDataUrl: string;
  format: string;
}) {
  const parsed = dataUrlToBuffer(params.imageDataUrl, params.format);
  if (!parsed) return null;

  const admin = await createServerClient({ admin: true });
  const bucket = process.env.SUPABASE_COMIC_BUCKET?.trim() || 'generated-comics';
  const extension = params.format === 'jpeg' ? 'jpg' : params.format;
  const path = [
    params.userId,
    params.sajuId,
    `${params.category}-${params.persona}-${params.hash}.${extension}`,
  ].join('/');

  const { error } = await admin.storage.from(bucket).upload(path, parsed.buffer, {
    cacheControl: '31536000',
    contentType: parsed.contentType,
    upsert: true,
  });

  if (error) {
    logger.warn('comics/generate', 'storage upload failed', {
      bucket,
      message: error.message,
    });
    return null;
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl || null;
}

async function saveComicCache(params: {
  userId: string;
  sajuId: string;
  category: string;
  persona: Persona;
  hash: string;
  imageUrl: string;
  title: string;
  model: string;
  format: string;
  promptVersion: string;
}) {
  const admin = await createServerClient({ admin: true });
  const { error } = await admin.from('interpretation_comics').upsert(
    {
      user_id: params.userId,
      saju_id: params.sajuId,
      category: params.category,
      persona: params.persona,
      content_hash: params.hash,
      image_url: params.imageUrl,
      title: params.title,
      model: params.model,
      format: params.format,
      prompt_version: params.promptVersion,
      generated_at: new Date().toISOString(),
    },
    {
      onConflict: 'saju_id,category,persona,content_hash,prompt_version',
    },
  );

  if (error) {
    logger.warn('comics/generate', 'cache save failed', {
      message: error.message,
    });
  }
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  if (!(await hasAiConsent(user.id))) {
    return NextResponse.json({ error: 'ai_consent_required' }, { status: 412 });
  }

  const rl = rateLimit(rateLimitKey(user.id, 'comic'), 3, 60_000);
  if (!rl.allowed)
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const { category, content, persona: personaInput } = Body.parse(await req.json());
  const persona = personaInput ?? 'dosa';
  const cat = INTERPRETATION_CATEGORIES.find((item) => item.key === category);
  if (!cat)
    return NextResponse.json({ error: 'unknown_category' }, { status: 400 });

  const { data: profile } = await supabase
    .from('saju_profiles')
    .select('*')
    .eq('owner_id', user.id)
    .eq('relation_type', 'self')
    .maybeSingle<SajuProfileRow>();
  if (!profile)
    return NextResponse.json({ error: 'no profile' }, { status: 404 });

  const hash = contentHash(content);
  const cached = await cachedComic({
    sajuId: profile.id,
    category,
    persona,
    hash,
  });
  if (cached) {
    return NextResponse.json({
      imageDataUrl: cached.image_url,
      imageUrl: cached.image_url,
      title: cached.title,
      model: cached.model,
      format: cached.format,
      cached: true,
    });
  }

  const saju = buildSajuResult({
    birthDate: profile.birth_date,
    birthTime: profile.birth_time ?? undefined,
    isLunar: profile.is_lunar,
    isLeapMonth: profile.is_leap_month,
    gender: profile.gender,
  });

  let creditsSpent = false;
  try {
    await spendCredits({
      userId: user.id,
      amount: CREDIT_COSTS.comic,
      reason: `사주 웹툰 생성:${category}`,
      referenceId: profile.id,
    });
    creditsSpent = true;
  } catch (e) {
    if (isInsufficientCreditsError(e)) {
      return NextResponse.json(
        { error: 'insufficient_credits' },
        { status: 402 },
      );
    }
    // fail-closed: 차감이 비-잔액 사유로 실패하면 유료 콘텐츠를 공짜로 주지 않는다.
    logger.error('comics/generate', 'credit spend failed', {
      userId: user.id,
      category,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: 'spend_failed' }, { status: 500 });
  }

  try {
    const result = await generateInterpretationComic({
      saju,
      category: category as InterpretationCategory,
      name: profile.name,
      content,
    });
    const imageUrl = await uploadComicImage({
      userId: user.id,
      sajuId: profile.id,
      category,
      persona,
      hash,
      imageDataUrl: result.imageDataUrl,
      format: result.format,
    });

    if (imageUrl) {
      await saveComicCache({
        userId: user.id,
        sajuId: profile.id,
        category,
        persona,
        hash,
        imageUrl,
        title: result.title,
        model: result.model,
        format: result.format,
        promptVersion: result.promptVersion,
      });
    }

    return NextResponse.json({
      imageDataUrl: imageUrl ?? result.imageDataUrl,
      imageUrl: imageUrl ?? null,
      title: result.title,
      model: result.model,
      format: result.format,
      cached: false,
    });
  } catch (e) {
    if (creditsSpent) {
      await addCredits({
        userId: user.id,
        amount: CREDIT_COSTS.comic,
        reason: `사주 웹툰 생성 실패 환불:${category}`,
        kind: 'refund',
        referenceId: profile.id,
      }).catch(() => undefined);
    }

    logger.error('comics/generate', 'failed', {
      userId: user.id,
      category,
      message: e instanceof Error ? e.message : String(e),
    });

    return NextResponse.json({ error: errorCode(e) }, { status: 500 });
  }
}
