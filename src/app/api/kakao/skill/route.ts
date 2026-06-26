import { NextResponse, after } from 'next/server';
import { handleKakaoSkill } from '@/lib/kakao/chatbot';
import { textResponse, type KakaoSkillRequest } from '@/lib/kakao/skill';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
// 콜백 모드의 백그라운드 LLM 호출(after)을 위한 충분한 함수 수명.
export const maxDuration = 60;

/**
 * 카카오 i 오픈빌더 스킬 서버 엔드포인트.
 *
 * 카카오는 스킬 요청에 서명을 붙이지 않으므로, 오픈빌더의 스킬 URL 에 비밀 토큰을
 * 심어 보호한다(헤더 X-Skill-Secret 또는 쿼리 ?secret=). KAKAO_SKILL_SECRET 이
 * 설정돼 있으면 일치해야만 처리하고, 미설정이면(초기 셋업 편의) 경고만 남기고 통과한다.
 */
function authorized(req: Request): boolean {
  const expected = process.env.KAKAO_SKILL_SECRET?.trim();
  if (!expected) {
    logger.warn(
      'kakao/skill',
      'KAKAO_SKILL_SECRET not set — skill endpoint is unauthenticated',
    );
    return true;
  }
  const provided =
    req.headers.get('x-skill-secret')?.trim() ||
    new URL(req.url).searchParams.get('secret')?.trim();
  return provided === expected;
}

// 카카오 검수/헬스 체크 핑 대응.
export async function GET() {
  return NextResponse.json({ ok: true, service: 'ggobuk-kakao-skill' });
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  }

  let body: KakaoSkillRequest;
  try {
    body = (await req.json()) as KakaoSkillRequest;
  } catch {
    return NextResponse.json(
      textResponse('요청을 이해하지 못했어요. 다시 시도해줄래?'),
    );
  }

  try {
    const result = await handleKakaoSkill(body);
    // 콜백 모드면 1차 응답을 보낸 뒤 백그라운드로 LLM 호출+콜백 POST 를 실행한다.
    if (result.deferred) {
      after(result.deferred);
    }
    return NextResponse.json(result.body);
  } catch (e) {
    logger.error('kakao/skill', 'unhandled exception', {
      error: e instanceof Error ? e.message : String(e),
    });
    // 카카오엔 항상 200 + 유효 템플릿으로 답해 "오류" 말풍선을 피한다.
    return NextResponse.json(
      textResponse('앗, 잠깐 문제가 생겼어. 잠시 뒤 다시 물어봐 줄래?'),
    );
  }
}
