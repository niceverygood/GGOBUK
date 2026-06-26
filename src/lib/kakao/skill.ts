// 카카오 i 오픈빌더 스킬 서버 — 요청/응답 타입과 응답 빌더.
//
// 카카오톡 채널 챗봇은 사용자의 발화를 "스킬"로 라우팅해 우리 서버(스킬 서버)로
// POST 한다. 우리는 아래 응답 포맷(version "2.0")으로 답한다. 자세한 스펙:
// https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide

/** 스킬 서버로 들어오는 요청 페이로드(필요한 필드만). */
export interface KakaoSkillRequest {
  bot?: { id?: string; name?: string };
  intent?: { id?: string; name?: string };
  userRequest?: {
    /** 사용자가 친 말 */
    utterance?: string;
    user?: {
      /** 채널·봇 스코프 고유키. 우리 DB 의 PK 로 쓴다. */
      id?: string;
      type?: string;
      properties?: Record<string, unknown>;
    };
    /** 블록에 "콜백 사용"이 켜져 있으면 존재. 5초 내 1차 응답 후 이 URL 로 최종답을 POST. */
    callbackUrl?: string;
    params?: Record<string, unknown>;
  };
  action?: {
    params?: Record<string, unknown>;
    detailParams?: Record<string, unknown>;
  };
}

/** 카카오 simpleText 출력 1버블. */
interface SimpleTextOutput {
  simpleText: { text: string };
}

/** 바로가기(퀵리플라이) 버튼. */
export interface QuickReply {
  label: string;
  action: 'message' | 'block';
  /** action: 'message' 일 때 사용자가 보낸 것처럼 전송될 텍스트. */
  messageText?: string;
  /** action: 'block' 일 때 이동할 블록 ID. */
  blockId?: string;
}

export interface KakaoSkillResponse {
  version: '2.0';
  /** true 면 카카오가 콜백 모드로 전환하고, data.text 를 임시 메시지로 보여준다. */
  useCallback?: boolean;
  template?: {
    outputs: SimpleTextOutput[];
    quickReplies?: QuickReply[];
  };
  /** useCallback 응답의 임시 안내 문구 등 부가 데이터. */
  data?: { text?: string };
}

// 카카오 simpleText 한 버블의 최대 길이는 1000자. 그 이상은 여러 버블로 쪼갠다.
const MAX_BUBBLE = 1000;
const MAX_BUBBLES = 3;

/**
 * 긴 텍스트를 1000자 이하 버블 여러 개로 자연스럽게(문단/문장 경계 우선) 쪼갠다.
 * 최대 3버블까지만 — 그 이상은 마지막 버블에 합치고 말줄임 없이 잘라 마무리한다.
 */
function chunkText(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_BUBBLE) return [trimmed];

  const bubbles: string[] = [];
  let rest = trimmed;
  while (rest.length > MAX_BUBBLE && bubbles.length < MAX_BUBBLES - 1) {
    const slice = rest.slice(0, MAX_BUBBLE);
    // 문단(빈 줄) → 줄바꿈 → 문장부호 순으로 가장 늦은 경계를 찾는다.
    let cut =
      slice.lastIndexOf('\n\n');
    if (cut < MAX_BUBBLE * 0.5) cut = slice.lastIndexOf('\n');
    if (cut < MAX_BUBBLE * 0.5) {
      const punct = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('? '),
        slice.lastIndexOf('! '),
        slice.lastIndexOf('요 '),
        slice.lastIndexOf('다 '),
      );
      if (punct > MAX_BUBBLE * 0.5) cut = punct + 1;
    }
    if (cut < MAX_BUBBLE * 0.5) cut = MAX_BUBBLE;
    bubbles.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  bubbles.push(rest.slice(0, MAX_BUBBLE).trim());
  return bubbles.filter(Boolean);
}

/** 평문 텍스트(+선택 퀵리플라이) 스킬 응답을 만든다. 길면 자동으로 여러 버블. */
export function textResponse(
  text: string,
  quickReplies?: QuickReply[],
): KakaoSkillResponse {
  const outputs = chunkText(text).map((t) => ({ simpleText: { text: t } }));
  return {
    version: '2.0',
    template: {
      outputs,
      ...(quickReplies && quickReplies.length > 0 ? { quickReplies } : {}),
    },
  };
}

/**
 * 콜백 모드 1차 응답. 카카오에 "최종답은 콜백 URL 로 보낼게"를 알리고,
 * data.text 를 즉시 임시 메시지로 보여준다(예: "꼬북이가 등껍질을 들여다보는 중...").
 */
export function callbackAck(waitingText: string): KakaoSkillResponse {
  return {
    version: '2.0',
    useCallback: true,
    data: { text: waitingText },
  };
}

/** message 액션 퀵리플라이 헬퍼. */
export function quickReply(label: string, messageText?: string): QuickReply {
  return { label, action: 'message', messageText: messageText ?? label };
}
