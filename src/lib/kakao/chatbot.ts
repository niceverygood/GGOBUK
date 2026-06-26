// 카카오톡 채널 챗봇 — 핵심 상태 머신.
//
// 카톡 채널 사용자는 앱 회원이 아닌 익명 봇 사용자다(userRequest.user.id 가 PK).
// 흐름:
//   1) 생년월일이 없으면 → 자유 발화에서 출생정보를 파싱해 받는다(없으면 되묻기).
//   2) 받은 즉시 사주를 계산·저장하고, 일주 카드(LLM 없이 즉답)로 환영 + 퀵리플라이.
//   3) 이후 발화는 페르소나 사주 상담 → LLM. 시간이 5초를 넘으므로 콜백 모드로 답한다.

import { createServerClient } from '@/lib/supabase/server';
import { buildSajuResult } from '@/lib/saju';
import { iljuProfileOf, iljuSlugOf } from '@/lib/saju/ilju_profile';
import { buildChatSystem } from '@/lib/llm/chat';
import { complete } from '@/lib/llm/client';
import { PERSONAS, type PersonaKey } from '@/lib/llm/personas';
import { extractBirthInfo } from './birthinfo';
import {
  callbackAck,
  quickReply,
  textResponse,
  type KakaoSkillRequest,
  type KakaoSkillResponse,
  type QuickReply,
} from './skill';
import { serverAppOrigin } from '@/lib/app-url';
import { todayKstIso } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';

interface KakaoChatUserRow {
  bot_user_key: string;
  name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  is_lunar: boolean;
  is_leap_month: boolean;
  gender: 'M' | 'F' | null;
  persona: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  msg_count: number;
  count_date: string | null;
}

export interface HandleResult {
  /** 카카오에 즉시 돌려줄 1차 응답. */
  body: KakaoSkillResponse;
  /** 콜백 모드일 때 응답 후(after) 백그라운드로 실행 — LLM 호출 + 콜백 URL POST. */
  deferred?: () => Promise<void>;
}

const HISTORY_TURNS = 12; // 최근 6턴(user+assistant) 보관
const DAILY_LIMIT = Math.max(
  1,
  Number(process.env.KAKAO_DAILY_MSG_LIMIT ?? '30') || 30,
);

// 사주 상담 주제 퀵리플라이 (일주 카드 환영 + 매 답변 뒤에 노출).
const TOPIC_QUICK_REPLIES: QuickReply[] = [
  quickReply('오늘의 운세', '오늘 나의 운세 알려줘'),
  quickReply('연애운', '내 연애운은 어때?'),
  quickReply('금전운', '내 금전운은 어때?'),
  quickReply('직업·진로', '내 직업운과 진로는 어때?'),
  quickReply('올해 총운', '올해 나의 전체 운세 알려줘'),
];

// 페르소나 전환 명령(라벨·별칭 → 키).
const PERSONA_ALIASES: Record<string, PersonaKey> = {
  꼬북이: 'kkobuk',
  도사: 'dosa',
  무당: 'mudang',
  보살: 'bosal',
};

/** 페르소나가 곧바로 사주 풀이를 시작하지 않고 환영만 하는 첫 인사. */
function welcomeText(): string {
  return [
    '안녕! 나는 등껍질에 네 사주를 새겨 읽어주는 꼬북이야. 🐢',
    '',
    '네 사주를 보려면 생년월일이 필요해. 이렇게 한 번에 알려줘:',
    '예) 1990년 3월 5일 오전 7시 30분 남자',
    '예) 1994.11.2 여자 (시간 모르면 안 적어도 돼)',
    '음력이면 "음력"이라고 같이 적어줘.',
  ].join('\n');
}

function askAgainText(missingGender: boolean, missingDate: boolean): string {
  if (missingDate) {
    return [
      '음, 생년월일을 못 찾았어. 이렇게 한 줄로 알려줄래?',
      '예) 1990년 3월 5일 오전 7시 30분 남자',
      '시간을 모르면 빼도 되고, 음력이면 "음력"이라고 적어줘.',
    ].join('\n');
  }
  if (missingGender) {
    return '성별만 알려주면 등껍질을 바로 읽을 수 있어. 남자야, 여자야?';
  }
  return welcomeText();
}

/** 사주 받은 직후 — LLM 없이 일주 60갑자 데이터로 즉답하는 환영 카드. */
function iljuWelcome(
  row: Pick<KakaoChatUserRow, 'birth_date' | 'birth_time' | 'is_lunar' | 'is_leap_month' | 'gender' | 'name'>,
): KakaoSkillResponse {
  const saju = buildSajuResult({
    birthDate: row.birth_date as string,
    birthTime: row.birth_time ?? undefined,
    isLunar: row.is_lunar,
    isLeapMonth: row.is_leap_month,
    gender: (row.gender ?? 'M') as 'M' | 'F',
  });
  const p = saju.palja;
  const ilju = iljuProfileOf(p.day.ganIdx, p.day.jiIdx);
  const who = row.name ? `${row.name}님은 ` : '너는 ';

  const lines: string[] = [];
  lines.push(
    `등껍질을 읽었어! ✨ ${p.year.gan}${p.year.ji}년 ${p.month.gan}${p.month.ji}월 ${p.day.gan}${p.day.ji}일${p.time ? ` ${p.time.gan}${p.time.ji}시` : ''} 사주야.`,
  );
  lines.push('');
  if (ilju) {
    lines.push(`${who}"${ilju.name}일주" — ${ilju.keywords.slice(0, 3).join(' · ')}.`);
    lines.push(ilju.ego);
    lines.push('');
    lines.push(`연애는, ${ilju.love}`);
    lines.push(`일·돈은, ${ilju.career}`);
    lines.push('');
  } else {
    lines.push(`${who}일간이 ${saju.ilgan}인 사주야.`);
    lines.push('');
  }
  lines.push('이제 뭐든 물어봐. 오늘 운세도, 연애도, 돈도, 진로도 등껍질에 다 있어.');

  const share = ilju
    ? `\n\n내 사주 캐릭터 카드 보기 → ${serverAppOrigin()}/ilju/${iljuSlugOf(ilju.index)}`
    : '';

  return textResponse(lines.join('\n') + share, TOPIC_QUICK_REPLIES);
}

/** cite 마크업([[위치:글자]])을 글자만 남기고 제거 — 카카오엔 카드 변환이 없다. */
function stripCiteMarkup(text: string): string {
  return text.replace(/\[\[\s*[^:\]]+?\s*:\s*([^\]]+?)\s*\]\]/g, '$1');
}

const KAKAO_LENGTH_NOTE = `

## 카카오톡 말풍선 — 길이·형식
- 여긴 카카오톡 채팅이라 답은 짧고 또렷하게. 3-6문장, 길어도 2단락 이내로 끝맺어라.
- 사주 글자 인용은 평범한 한국어로 풀어 말하고, 대괄호 마크업([[…]])이나 마크다운 기호는 절대 쓰지 마라.
- 마지막 문장은 반드시 마침표로 자연스럽게 끝내라(중간에 끊기지 않게).`;

/** 페르소나 사주 상담 — 단발 응답(콜백으로 보낼 최종답). */
async function kakaoChatAnswer(row: KakaoChatUserRow, userMessage: string): Promise<string> {
  const saju = buildSajuResult({
    birthDate: row.birth_date as string,
    birthTime: row.birth_time ?? undefined,
    isLunar: row.is_lunar,
    isLeapMonth: row.is_leap_month,
    gender: (row.gender ?? 'M') as 'M' | 'F',
  });
  const personaKey = (
    PERSONAS[row.persona] ? row.persona : 'kkobuk'
  ) as PersonaKey;
  const system =
    buildChatSystem({
      persona: personaKey,
      saju,
      name: row.name ?? undefined,
    }) + KAKAO_LENGTH_NOTE;

  const { text } = await complete({
    tier: 'saju',
    system,
    messages: [
      ...row.history,
      { role: 'user', content: userMessage },
    ],
    maxTokens: 1200,
    temperature: 0.7,
  });
  return stripCiteMarkup(text).trim();
}

function isResetCommand(u: string): boolean {
  return /(생년월일|생일|출생|정보)\s*(변경|수정|다시|바꾸|초기화)|^(다시|처음부터|초기화|리셋)$/.test(
    u,
  );
}

function matchPersona(u: string): PersonaKey | null {
  for (const [label, key] of Object.entries(PERSONA_ALIASES)) {
    if (u.includes(label)) return key as PersonaKey;
  }
  return null;
}

/**
 * 스킬 요청 1건을 처리한다. 즉답 body 와(콜백이면) 백그라운드 deferred 를 돌려준다.
 */
export async function handleKakaoSkill(
  req: KakaoSkillRequest,
): Promise<HandleResult> {
  const botUserKey = req.userRequest?.user?.id?.trim();
  const utterance = (req.userRequest?.utterance ?? '').trim();
  const callbackUrl = req.userRequest?.callbackUrl;

  if (!botUserKey) {
    return { body: textResponse('사용자 정보를 확인하지 못했어요. 다시 시도해줘!') };
  }

  const admin = await createServerClient({ admin: true });

  // 사용자 행 로드(없으면 즉석 생성).
  const { data: existing } = await admin
    .from('kakao_chat_users')
    .select('*')
    .eq('bot_user_key', botUserKey)
    .maybeSingle();

  let row = (existing as KakaoChatUserRow | null) ?? null;
  if (!row) {
    await admin
      .from('kakao_chat_users')
      .upsert({ bot_user_key: botUserKey }, { onConflict: 'bot_user_key' });
    row = {
      bot_user_key: botUserKey,
      name: null,
      birth_date: null,
      birth_time: null,
      is_lunar: false,
      is_leap_month: false,
      gender: null,
      persona: 'kkobuk',
      history: [],
      msg_count: 0,
      count_date: null,
    };
  }
  // history 가 null/형식이상이면 빈 배열로.
  if (!Array.isArray(row.history)) row.history = [];

  // ── 명령: 정보 초기화 ──
  if (isResetCommand(utterance)) {
    await admin
      .from('kakao_chat_users')
      .update({
        birth_date: null,
        birth_time: null,
        gender: null,
        name: null,
        history: [],
        updated_at: new Date().toISOString(),
      })
      .eq('bot_user_key', botUserKey);
    return { body: textResponse(welcomeText()) };
  }

  // ── 명령: 페르소나 전환 (전환 의도가 분명할 때만) ──
  const wantPersona = /바꿔|바꾸|전환|모드|에게|한테|불러|소환/.test(utterance)
    ? matchPersona(utterance)
    : null;
  if (wantPersona && wantPersona !== row.persona) {
    await admin
      .from('kakao_chat_users')
      .update({ persona: wantPersona, updated_at: new Date().toISOString() })
      .eq('bot_user_key', botUserKey);
    const label =
      Object.entries(PERSONA_ALIASES).find(([, k]) => k === wantPersona)?.[0] ??
      wantPersona;
    const intro = PERSONAS[wantPersona]?.speechSamples?.[0] ?? '';
    const body = row.birth_date
      ? textResponse(
          `이제 ${label} 모드야. ${intro}\n무엇이 궁금해?`,
          TOPIC_QUICK_REPLIES,
        )
      : textResponse(`이제 ${label} 모드야. ${intro}\n${welcomeText()}`);
    return { body };
  }

  // ── 출생정보 미보유 → 수집 ──
  if (!row.birth_date) {
    // 첫 진입(빈 발화 또는 인사)엔 환영만.
    if (!utterance || /^(안녕|하이|시작|hi|hello|ㅎㅇ)/i.test(utterance)) {
      return { body: textResponse(welcomeText()) };
    }

    const info = await extractBirthInfo(utterance);
    if (!info.found || !info.birthDate || !info.gender) {
      return {
        body: textResponse(
          askAgainText(info.missing.includes('gender'), info.missing.includes('birthDate')),
        ),
      };
    }

    // 사주 계산이 실패하면(경계값 등) 안내 후 재입력 유도.
    try {
      buildSajuResult({
        birthDate: info.birthDate,
        birthTime: info.birthTime ?? undefined,
        isLunar: info.isLunar,
        isLeapMonth: info.isLeapMonth,
        gender: info.gender,
      });
    } catch (e) {
      logger.warn('kakao/chatbot', 'saju calc failed on birth intake', {
        error: e instanceof Error ? e.message : String(e),
      });
      return {
        body: textResponse(
          '입력한 날짜로 사주를 계산하지 못했어. 생년월일을 다시 한 번 정확히 알려줄래?',
        ),
      };
    }

    const updated = {
      birth_date: info.birthDate,
      birth_time: info.birthTime,
      is_lunar: info.isLunar,
      is_leap_month: info.isLeapMonth,
      gender: info.gender,
      name: info.name,
      history: [],
      updated_at: new Date().toISOString(),
    };
    await admin
      .from('kakao_chat_users')
      .update(updated)
      .eq('bot_user_key', botUserKey);

    return {
      body: iljuWelcome({
        birth_date: info.birthDate,
        birth_time: info.birthTime,
        is_lunar: info.isLunar,
        is_leap_month: info.isLeapMonth,
        gender: info.gender,
        name: info.name,
      }),
    };
  }

  // ── 사주 보유 → 상담(LLM) ──
  // 일일 비용 가드.
  const today = todayKstIso();
  const countToday = row.count_date === today ? row.msg_count : 0;
  if (countToday >= DAILY_LIMIT) {
    return {
      body: textResponse(
        `오늘은 여기까지 봐줄 수 있어. 내일 다시 와줘! 더 깊은 풀이는 앱에서 이어서 볼 수 있어 👉 ${serverAppOrigin()}`,
      ),
    };
  }

  if (!utterance) {
    return {
      body: textResponse('무엇이 궁금해? 오늘 운세든, 연애든, 돈이든 물어봐!', TOPIC_QUICK_REPLIES),
    };
  }

  const snapshot = row; // deferred 클로저에서 사용할 안정 참조

  // 콜백이 켜져 있으면 1차로 "생각 중" 응답 후 백그라운드에서 최종답 POST.
  if (callbackUrl) {
    return {
      body: callbackAck('꼬북이가 등껍질을 들여다보는 중이야... 🐢'),
      deferred: async () => {
        let answer: string;
        try {
          answer = await kakaoChatAnswer(snapshot, utterance);
        } catch (e) {
          logger.error('kakao/chatbot', 'answer failed', {
            error: e instanceof Error ? e.message : String(e),
          });
          answer =
            '미안, 지금 등껍질이 잘 안 읽혀. 잠시 뒤 다시 한 번 물어봐 줄래?';
        }

        const nextHistory = [
          ...snapshot.history,
          { role: 'user' as const, content: utterance },
          { role: 'assistant' as const, content: answer },
        ].slice(-HISTORY_TURNS);

        await admin
          .from('kakao_chat_users')
          .update({
            history: nextHistory,
            msg_count: countToday + 1,
            count_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq('bot_user_key', botUserKey);

        try {
          await fetch(callbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(textResponse(answer, TOPIC_QUICK_REPLIES)),
          });
        } catch (e) {
          logger.error('kakao/chatbot', 'callback POST failed', {
            error: e instanceof Error ? e.message : String(e),
          });
        }
      },
    };
  }

  // 콜백 미설정(블록에 콜백 미사용) → 5초 내 동기 응답 시도(짧게).
  let answer: string;
  try {
    answer = await kakaoChatAnswer(snapshot, utterance);
  } catch (e) {
    logger.error('kakao/chatbot', 'sync answer failed', {
      error: e instanceof Error ? e.message : String(e),
    });
    return {
      body: textResponse('지금 등껍질이 잘 안 읽혀. 잠시 뒤 다시 물어봐 줄래?'),
    };
  }

  const nextHistory = [
    ...snapshot.history,
    { role: 'user' as const, content: utterance },
    { role: 'assistant' as const, content: answer },
  ].slice(-HISTORY_TURNS);
  await admin
    .from('kakao_chat_users')
    .update({
      history: nextHistory,
      msg_count: countToday + 1,
      count_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('bot_user_key', botUserKey);

  return { body: textResponse(answer, TOPIC_QUICK_REPLIES) };
}
