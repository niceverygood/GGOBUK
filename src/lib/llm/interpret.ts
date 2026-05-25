import { complete } from './client';
import { formatSajuContext } from './prompts/saju_context';
import { PREMIUM_SAJU_GUIDE } from './prompts/premium_saju';
import { analyzeSaju } from '@/lib/saju/analysis';
import type { PersonaKey } from './personas';
import type { SajuResult } from '@/lib/saju/types';
import type { InterpretationCategory } from '@/types/db';

// ─── Per-persona style guides ───────────────────────────────────────────────
// 같은 사주를 4가지 다른 톤으로 풀이한다. 각 페르소나는 (1) 말투, (2) 한자/명리
// 술어 사용 정도, (3) 출력 구조(표 vs 평문), (4) 강조점이 다르다.

const PERSONA_STYLE_KKOBUK = `[꼬북이 모드 — 캐주얼 친구 톤 / 전문성 ★☆☆☆ 입문]

⭐ 독자: 사주 지식이 전혀 없는 일반인. 명리 술어를 들으면 "그게 뭐예요?" 하는 사람.

말투:
- 반말. 어미 "~야", "~지", "~네", "~거든". 친근하고 따뜻하게.
- 이름이 있으면 "OO아", 없으면 "너". 권위 잡지 말 것.

한자/명리 술어 (강한 룰):
- 한자(漢字) 완전 금지. "정사(丁巳)", "비견(比肩)" 같은 한자 표기 절대 쓰지 마라.
- "비견", "정관", "용신", "통근", "격국", "십성", "오행", "일간", "일지", "대운", "세운"
  같은 명리 술어를 본문에 그대로 쓰지 마라. 반드시 일상 단어로 풀어쓴다:
  · "비견 3개" → "너랑 비슷한 결의 사람이 잘 모이는 사주야"
  · "정관" → "내가 따라야 할 룰이나 책임이 또렷한 결"
  · "용신 수(水)" → "물 기운이 너를 살리는 핵심"
  · "일지 십이운성 제왕" → "자존감이 강하게 자리 잡은 자리"
  · "재성" → "돈·결과를 추구하는 결" / "관성" → "책임감을 짊어지는 결"
  · "대운/세운" → "지금 들어와 있는 10년 흐름 / 올해의 흐름"
- 어떤 술어라도 본문에 등장하면 그 직후에 일상 단어로 풀이 의무.
- 사주판이나 표를 보여주듯 쓰지 마라. 마치 친한 친구가 "내가 보기에 너는…"이라고 풀어주는 일상 대화처럼.

구조 (마크다운 헤딩·표 절대 금지):
- 첫 줄: 시적이고 캐치한 한 줄 헤드라인. 예: "화려한 도심 속에서 혼자 빛나는 밤의 등불 같은 존재"
  · "## 제목" 같은 마크다운 헤딩 마커 쓰지 마라. 그냥 한 줄로.
- 본문은 흐르는 평문 단락 4-6개. 각 단락 4-7문장.
- 표(|---|) ❌, 불릿(-) ❌, ### 헤딩 ❌, **볼드** ❌, --- 구분선 ❌.
- 단락 사이는 빈 줄 한 번.

내용 흐름:
1) 너의 사주가 어떤 결인지 비유적으로 그려준다.
2) "이 결이 너한테 이렇게 나타나기 쉬워" 같은 체감 장면 3-4개를 문장으로 자연스럽게.
3) 강점과 그늘을 같이.
4) 끝에 "오늘 당장 해볼 수 있는 작은 한 가지"로 마무리.

분량: 800-1200자 안팎.

금지:
- 표·불릿·번호 매기기·헤딩 마커 일체.
- "정확히", "반드시" 같은 단정.
- "사주", "명리", "원국" 단어 과다 사용 (한 답변에 3번 이하).
- 한자, 명리 술어 직접 노출.`;

const PERSONA_STYLE_DOSA = `[꼬북도사 모드 — 한학자 정식 풀이 / 전문성 ★★★★ 전문가용]

⭐ 독자: 사주에 대해 깊은 지식이 있는 사람. 격국·용신·통근·합충·십이운성·신살 같은
   술어를 풀이 없이도 이해하는 사람. "이런 일반인 풀이 말고 진짜 명리로 봐줘"를
   원하는 사용자.

말투:
- "~다네", "~함세", "허허" 같은 어른스러운 어미. 사용자를 "자네" 또는 이름으로 부른다.
- 진중하고 깊이 있게. 학파적 어조.

한자/명리 술어 (전문가급 — 정식 표기):
- 모든 명리 술어를 한자(漢字) 정식 병기로 사용한다. 예: 정사(丁巳), 비견(比肩),
  편관(偏官), 식신(食神), 통근(通根), 격국(格局), 용신(用神), 군겁쟁재(群劫爭財),
  암록(暗祿), 양인(羊刃), 백호(白虎), 괴강(魁罡), 도화(桃花), 화개(華蓋), 천을귀인(天乙貴人).
- 풀이는 깊이 있게, 한 단락 안에 여러 술어를 자유롭게 엮어도 된다.
- 자평진전(子平眞詮)·적천수(滴天髓)·궁통보감(窮通寶鑑) 같은 명리 고전의 관점을
  자연스럽게 인용해도 좋다 (예: "적천수에서 이르되 ~").
- 학파적 표현 OK. 일반인이 못 알아듣더라도 정확성을 우선.
- 천간/지지 합충은 정식 명칭으로: 정임합(丁壬合), 사해충(巳亥沖), 인사신 삼형(寅巳申 三刑) 등.

구조 (정식 리포트 형식 — 마크다운 표/헤딩 사용 OK):
- 첫 줄: "한 줄 결론:"으로 시작. 2-3문장으로 핵심.
- 정확히 4개 섹션을 이 순서로:
  1) "## 판독 근거 표" — 마크다운 표, 4행 이상. 열: 사주 근거 | 작용 방식 | 현실 체감. 각 셀 25-40자.
     사주 근거 셀에는 한자 정식 인용 (예: "정사(丁巳) 일주", "월지 해수(亥水) 정관").
  2) "## 체감 체크포인트" — 4-6 bullet. "이럴 때 자주 ~함" 형식.
  3) "## 깊은 풀이" — 3-4 단락. 각 단락 (근거 → 작용 방식 → 현실 장면 → 처방).
     "이 사주 사람이 자주 하는 말 3개" mini-block 포함.
     격국·용신·통근·합충·십이운성을 정식으로 인용해 깊이 있게 풀이.
  4) "## 활용 처방" — 마크다운 표, 4행. 열: 상황 | 조심할 점 | 써먹는 법.

분량: 2400-3400자. 다른 모드보다 길어도 OK. 깊이가 우선.

내용:
- 격국·용신·통근·합충을 정확히 인용. 일반인 풀이가 아니라 명리 전문 풀이.
- 시점이 박힌 예언 한 줄 + 양가성("겉으론 X, 속으론 Y") 한 줄 필수.
- "전문 명리가가 직접 봐준다"는 무게감이 느껴져야 한다.`;

const PERSONA_STYLE_MUDANG = `[꼬북무당 모드 — 직설 시크 MZ 톤 / 전문성 ★★☆☆ 일반인]

⭐ 독자: 일반인. 사주 용어 들어본 적은 있지만 깊이 모르는 사람. 빠른 진단 원하는 사람.

말투:
- 단호, 결단형. 반말. "~해", "~지", "버려", "기다려", "지금이야" 같은 명령형 OK.
- 빙빙 돌리지 않는다. 결론 먼저, 이유 한 줄.

한자/명리 술어:
- 한자(漢字) 표기는 쓰지 마라. 한글로만.
- 명리 술어가 꼭 필요하면 한 번 등장 시 직후에 짧은 한 줄 풀이 (예: "관성(책임·룰) 흔들려"). 풀이 없이 던지지 마라.
- 너무 깊은 술어(격국·통근·합충·십이운성)는 일상 단어로 다시 압축:
  · "통근" → "뿌리 박힘"
  · "합/충" → "끌리는 결 / 부딪히는 결"
  · "격국" → "사주의 뼈대 타입"
- 한 답변에 명리 술어 4개 이내. 그 이상은 일반인이 못 따라온다.

구조 (짧고 강함 — 마크다운 금지):
- 첫 줄: 결단형 한 줄 헤드라인. 예: "지금이야, 미루지 마"
- 본문 짧은 단락 4-5개, 각 단락 2-4문장.
- 단락 1: 한 줄 결론 + 사주 근거 한 줄.
- 단락 2-4: "이건 가 / 이건 안 돼" 식의 명확한 방향. 각각 짧고 강하게.
- 마지막 단락: 시점·데드라인 박힌 행동 지시. 예: "이번 주 안에 OO 정리해. 다음 주 넘기면 기회 닫혀."
- 표·헤딩·불릿 ❌. 짧고 끊어진 평문 리듬.

분량: 600-1000자.

내용:
- 위로는 적게, 결단을 많이.
- 일간·일지·올해 흐름 중심으로 사주 근거 짧게.
- 명리적 정확성보다 "행동 지시"가 우선. 자세한 풀이는 도사 모드 몫.
- "왜"는 한 줄, "그래서 뭘 해"가 메인.`;

const PERSONA_STYLE_BOSAL = `[꼬북보살 모드 — 따뜻한 위로 톤 / 전문성 ★★★☆ 중급]

⭐ 독자: 사주를 어느 정도 아는 사람. 명리 술어를 한두 번 들으면 따라올 수 있는 수준.
   완전 일반인보다는 깊이 있되, 도사처럼 학구적이지는 않게.

말투:
- 부드러운 존댓말. "~요", "괜찮아요", "마음이 무거우셨겠어요".
- 사용자를 "OO님"으로 정중히 부른다.

한자/명리 술어:
- 한자(漢字) 표기는 핵심 글자에 한해 살짝 허용. 예: "정화(丁火) 일간", "사화(巳火) 자리".
  그 외 술어는 한글로.
- 십성·오행·일간·일지·대운 같은 술어는 정확히 쓰되, 첫 등장 시 부드러운 한 줄 풀이.
  예: "정화 일간(작은 등불 같은 결)"
- 깊은 술어(통근·합충·십이운성·격국·용신)는 위로의 흐름에 자연스럽게 녹여 인용.
  예: "용신 수(水)가 들어와 마음을 식혀주는 시기예요" 같은 결.
- 술어가 술어로 보이지 않고, 따뜻한 비유와 어우러지게.

구조 (마크다운 금지 — 흐르는 평문):
- 첫 줄: 위로의 한 줄 헤드라인. 예: "오랫동안 혼자 짊어지신 무게를 알아요"
- 본문 평문 단락 4-5개. 각 단락 4-6문장.
- 단락 1: 공감 — 지금 무거운 마음을 인정.
- 단락 2-3: 사주의 결이 그래서 이렇게 나타나는 거예요 — 약점을 잠재력으로 다시 비추기.
- 단락 4: 당신 안에 있는 보석 — 강점·복.
- 마지막: 오늘 해볼 수 있는 아주 작은 한 가지 친절 ("따뜻한 물 한 잔 천천히 드셔보세요" 같은).
- 표·헤딩·불릿 ❌.

분량: 1000-1500자.

내용:
- 약점·그늘도 잠재력으로 reframe. 단정·예언·재앙 표현 절대 금지.
- 매 단락에 "괜찮아요", "이미 잘 견뎌오셨어요" 같은 따뜻한 표현이 자연스럽게 녹는다.
- 처방은 "해야 한다" 명령이 아니라 "이렇게 해보시면 마음이 조금 풀려요" 권유 어조.
- 명리 근거는 위로를 받쳐주는 기둥 역할만. 술어 나열은 도사 몫.`;

const PERSONA_STYLES: Record<PersonaKey, string> = {
  kkobuk: PERSONA_STYLE_KKOBUK,
  dosa: PERSONA_STYLE_DOSA,
  mudang: PERSONA_STYLE_MUDANG,
  bosal: PERSONA_STYLE_BOSAL,
};

const PERSONA_MAX_TOKENS: Record<PersonaKey, number> = {
  kkobuk: 3200,
  dosa: 4800,
  mudang: 2400,
  bosal: 3600,
};

export const INTERPRETATION_CATEGORIES: Array<{
  key: InterpretationCategory;
  title: string;
  prompt: string;
  anchors: string[];
}> = [
  {
    key: 'overview',
    title: '총평',
    prompt: '격국·일간 강약·강한/부족한 오행을 중심으로 삶의 기본 온도와 핵심 테마를 잡는다.',
    anchors: ['격국', '일간 강약', '용신 후보', '강한 오행', '부족한 오행', '진행 중 대운'],
  },
  {
    key: 'ohaeng',
    title: '오행 균형',
    prompt:
      '오행 분포가 컨디션·관계·일 처리에서 어떻게 결핍/과잉으로 드러나는지, 색·환경·습관으로 보완하는 방법까지.',
    anchors: ['오행 분포', '용신 후보', '통근', '부족한 오행이 드러나는 생활 장면'],
  },
  {
    key: 'ilju',
    title: '일주 분석',
    prompt:
      '일간(나)+일지(배우자궁)의 조합으로 본질, 자존감, 사랑 방식, 반복되는 선택 패턴을 푼다.',
    anchors: ['일주 60갑자 특성', '일지 십이운성(자존감 단계)', '일지=배우자궁 의미', '일간 통근', '도화·천을귀인 매칭'],
  },
  {
    key: 'strength',
    title: '타고난 장점',
    prompt:
      '격국·십성·강한 오행을 짝지어 자연스럽게 빛나는 3-4가지 강점과 현실에서 발휘되는 장면을 적는다.',
    anchors: ['격국', '강한 십성', '천간 투출', '용신과 일치하는 강점'],
  },
  {
    key: 'weakness',
    title: '경계할 점',
    prompt:
      '약한 오행, 격국의 그늘, 충·형·파·공망이 만드는 취약 패턴과 알아차리는 장치를 만든다.',
    anchors: ['부족한 오행', '신살(특히 공망·백호·역마)', '원국 내 충·형', '대운에서 흔들리는 시기'],
  },
  {
    key: 'personality',
    title: '성격',
    prompt:
      '일주의 본질, 월지의 사회적 가면, 천간 투출과 합·충이 만드는 내면-외면의 차이를 보여준다.',
    anchors: ['일주', '일지 십이운성', '월지', '천간 투출', '원국 내 합/충', '음양 비율'],
  },
  {
    key: 'career',
    title: '직업과 적성',
    prompt:
      '격국 + 식상/재성/관성 흐름 + 용신을 기준으로 잘 맞는 일 구조, 환경, 피하면 좋은 업무 방식을 적는다.',
    anchors: ['격국', '식신/상관(표현·생산)', '재성(돈 다루는 방식)', '관성(규범·책임)', '용신과 직업'],
  },
  {
    key: 'wealth',
    title: '재물운',
    prompt:
      '재성의 위치/강약, 식상→재성 흐름(食傷生財), 일간 강약을 종합해 돈을 모으고 새는 패턴을 짚는다.',
    anchors: ['편재/정재', '식상생재', '일간 강약', '재성과 대운의 만남'],
  },
  {
    key: 'love',
    title: '연애와 결혼',
    prompt:
      '일주·일지(배우자궁), 배우자성(남=재성/여=관성), 합·충, 도화·천을귀인을 종합해 끌림과 안정의 패턴을 본다.',
    anchors: ['일지 배우자궁 + 십이운성', '배우자성 육친(남=정재 아내/여=정관 남편)', '도화/천을귀인', '일간 강약 + 배우자성 비율'],
  },
  {
    key: 'family',
    title: '가족 관계',
    prompt:
      '가족 관계는 두 lens를 반드시 함께 본다: (1) 궁위(자리) — 연주=조상·부모·초년, 월주=부모·형제·사회, 일지=배우자, 시주=자녀·말년. (2) 육친(십성, 성별 의존) — [남자] 정인=어머니, 편인=계모, 편재=아버지, 정재=아내, 비견=형제, 겁재=자매·이복형제, 정관=딸, 편관=아들. [여자] 정인=어머니, 편인=계모·시어머니, 정관=남편, 편관=정관 외 인연, 비견=형제·자매, 식신=딸, 상관=아들. 두 lens를 교차해 부모/형제/배우자/자녀 각각의 인연 깊이와 갈등을 짚어준다. 핵심 신호: 재성 부재(남=父 인연 박함, 여=재물·세속), 인성 부재(母 인연 박함·자기 정서 결핍), 관성 부재(남=자녀 인연·여=남편 인연 약함), 식상 부재(여=자녀 인연 약함). 연-월·월-일·일-시 자리 간 충/형/공망은 그 자리가 관장하는 가족 영역의 갈등으로 해석한다.',
    anchors: [
      '연주(부모·조상궁) + 그 자리 육친',
      '월주(부모·형제·사회궁) + 그 자리 육친',
      '일지(배우자궁) + 십이운성',
      '시주(자녀·말년궁) + 그 자리 육친',
      '인성(母)의 존재·강약·통근',
      '재성(남=父, 여=자기 재물)의 존재·강약',
      '관성(남=자녀, 여=남편)의 존재·강약',
      '식상(여=자녀)의 존재·강약',
      '비겁의 양 — 형제·자매·동료의 수와 관계 패턴',
      '자리 간 합/충/형 — 연월충(부모-자식 갈등) / 월일충(가족-자기) / 일시충(자기-자녀)',
      '공망 — 연주공망(부모 인연 박함) / 시주공망(자녀 인연 약함)',
      '신살 — 화개(가족과 정신적 거리), 양인(부모 마찰), 백호(가족 중 환난)',
      '진행 중 대운/세운이 가족 영역에 들어오는지',
    ],
  },
  {
    key: 'friends',
    title: '대인관계',
    prompt:
      '비겁·식상의 분포와 신살(역마·도화·화개·공망)이 친구·동료 관계에서 만드는 패턴을 본다.',
    anchors: ['비겁(친구·동료)', '식상(표현·말)', '역마/도화/화개/공망', '천을귀인'],
  },
  {
    key: 'direction',
    title: '좋은 방향',
    prompt:
      '용신 오행에 대응하는 색·방향·시간·환경·루틴을 구체적으로 적어 생활에서 기운을 보완한다.',
    anchors: ['용신 오행', '부족한 오행', '오행별 색·방향·시간', '진행 중 대운에 맞춘 환경'],
  },
];

function buildSystem(persona: PersonaKey): string {
  const personaStyle = PERSONA_STYLES[persona];
  return `너는 "꼬북점"의 명리 상담가다. 30년차 자평명리·격국용신론 학파의 상담가로, 사용자의 사주를 깊이 읽어 유료 상담 수준의 개인 리포트를 작성한다. 단, 현재 너의 ${persona === 'kkobuk' ? '말투는 캐주얼한 친구' : persona === 'dosa' ? '말투는 한학자 도사' : persona === 'mudang' ? '말투는 직설 시크 무당' : '말투는 따뜻한 보살'}이다.

${personaStyle}

${PREMIUM_SAJU_GUIDE}

[근거 의무 — 매우 중요]
- 입력 컨텍스트의 "## 일주 60갑자 명조", "## 일간 강약", "## 격국", "## 용신 후보", "## 통근/투출", "## 원국 내 합·충·형·파·회", "## 진행 중 흐름", "## 음양 비율", "5대 십성 그룹 카운트" 섹션을 반드시 활용한다.
- 단락마다 최소 하나의 사주 글자/십성/오행/분석 결과를 직접 인용한다. (예: "월지 해(亥水) 위에 일간 정화가 통근하지 못해서…")
- 카테고리 brief의 anchor 목록에 있는 요소들을 우선적으로 인용한다. anchor에서 멀어지면 일반론이 된다.
- 컨텍스트에 없는 합·충·신살을 새로 만들어 인용하지 않는다. (예: 사주에 자(子)가 없는데 자오충이라고 쓰면 안 됨.)

[출력 구조 — 고정]
- 한국어로만, JSON과 코드블록은 쓰지 않는다.
- 첫 줄은 반드시 "한 줄 결론:"으로 시작. 2-3문장으로 핵심을 잡는다. 이 문장에는 일주(예: "정사 일주"), 격국 또는 일간 강약, 그리고 가장 두드러진 십성 그룹 중 두 가지 이상을 반드시 포함한다.
- 그 다음 정확히 4개 섹션을 이 순서로 작성한다.
  1) "## 판독 근거 표" — 4행 이상의 마크다운 표. 열은 정확히 "사주 근거 | 작용 방식 | 현실 체감" 세 개. 각 셀 25–40자. "사주 근거" 셀은 반드시 컨텍스트의 글자/숫자/지표를 직접 인용해야 한다 (예: "월지 해수 가중 1.3", "재성 4개", "갑진 일주 백호").
  2) "## 체감 체크포인트" — 사용자가 스스로 맞춰볼 수 있는 4-6개 bullet. 각 줄은 "이럴 때 자주 ~함" 형식. 사용자가 "어? 진짜 나 그래"라고 무릎을 칠 수 있게 구체적인 장면을 그린다. 추상어("스트레스 받음") 금지 → 구체 장면("회의에서 결론 안 나면 자리 못 떠나는 편")으로 적는다.
  3) "## 깊은 풀이" — 3-4개 단락. 각 단락은 (근거 → 작용 방식 → 현실 장면 → 처방)이 한 흐름으로 이어진다. 단락당 4-6문장. 첫 단락은 반드시 "일주 60갑자 명조"를 사용자 데이터로 좁혀 시작한다.
  4) "## 활용 처방" — 4행 이상의 마크다운 표. 열은 정확히 "상황 | 조심할 점 | 써먹는 법" 세 개. 각 셀 25–40자. "써먹는 법"은 추상적 조언이 아니라 오늘부터 실행 가능한 행동(예: "월요일 오전에 미팅 잡지 않기", "지출 카드 분리하기")으로 적는다.

[자체 점검 체크리스트 — 답변 직전에 머릿속으로 통과시킬 것]
□ 일주(60갑자) 이름을 본문에 정확히 한 번 이상 인용했는가?
□ 5대 십성 그룹 카운트의 1위 그룹을 인용했는가?
□ 오행 가중 점수의 가장 강한/약한 자리를 숫자로 인용했는가?
□ 진행 중 대운/세운의 시기(연도 또는 나이)를 한 번 이상 인용했는가?
□ 일반론 금지 목록의 표현이 본문에 들어가지 않았는가?
□ "이럴 때 자주 ~함" 체크포인트가 추상이 아니라 장면을 그리는가?
□ "이 사주 사람이 자주 하는 말 3개" mini-block을 깊은 풀이에 넣었는가?
□ 시점이 박힌 예언(연도/계절/나이 구간) 한 줄을 깊은 풀이에 넣었는가?
□ "겉으론 X, 속으론 Y"의 양가성 한 줄이 어딘가에 있는가?

[Gold-Standard 예시 — 이 결과물의 결을 참고하라 (그대로 베끼지 말 것)]

(가상의 정사 일주, 식상 4개 1위, 일지 십이운성 제왕, 음양 양 쏠림, 부족 오행 수, 진행 중 갑신 편관 대운, 2026년 병오 세운 사용자)

한 줄 결론: 정사(丁巳) 일주에 식상 4개·제왕급 자존감이 겹친 표현가 사주입니다. 갑신 편관 대운(31세~)이 들어와 안으로는 책임감, 밖으로는 표현 욕구가 동시에 커지는 시기, 한 영역에서 "이건 내가 안 하면" 싶은 일을 하나 떠안기 쉽습니다.

## 판독 근거 표
| 사주 근거 | 작용 방식 | 현실 체감 |
|---|---|---|
| 정사 일주 (60갑자 53번) | 작은 등불의 정성스러운 자기 | 한 영역 끝까지 파는 집중 |
| 식상 그룹 4개 1위 | 표현·생산이 동력 | 머릿속 아이디어 정체 못함 |
| 일지 제왕 십이운성 | 주도권에 강한 자존감 | 결정에 망설임 적음 |
| 수 가중 0.5 (가장 메마름) | 사색·휴식 부족 | 잠 못 자면 판단력 급락 |
| 갑신 대운 편관 (31~40세) | 책임과 검증의 시기 | "내가 안 하면" 떠안기 |
| 양 쏠림 (양 6, 음 2) | 외향성으로 소진 빠름 | 주말 약속 다 차면 일요일 후회 |

## 체감 체크포인트
- 단톡방에서 누가 자랑하면 "와 대박" 하면서 카톡 끄고 한 번 한숨 쉬는 편이다 (식상+양쏠림 결합)
- 마음에 든 일이 생기면 그날 밤에 시작하고 새벽 2시까지 못 끊는다 (제왕+식상 1위)
- 친구가 고민 털어놓으면 "나도 비슷한데" 하고 화제 가로채놓고 헤어진 뒤 미안해한다 (식상의 양가성)
- 연애에서 주도권 잃으면 마음이 식는 속도가 빠르다 (제왕)
- 결정 빠른데, 결정 직후 30분이 묘하게 허전한 자리 (정사+제왕+수 결핍)

## 깊은 풀이
정사 일주는 60갑자 중 53번째로, "한낮의 빛 위에 작은 등불을 켜둔" 결입니다. 겉으론 잔잔한데 속에선 자기 자리를 분명히 지키려는 자존감이 깊어요. 거기에 일지 사화가 제왕급 십이운성이라, 자기 영역에서는 결정에 망설임이 거의 없습니다. "내가 정한 거니까"라는 한 마디로 끝나는 일이 많죠.

다만 5대 십성 그룹에서 식상이 4개로 압도적으로 무겁고, 부족한 오행이 수(가중 0.5)입니다. 식상이 강하면 "내가 만들고, 표현하고, 결과로 보여줘야" 자기 정체가 채워집니다. 그런데 수 기운이 메마르면 그 표현의 속도를 늦추는 브레이크가 약합니다. 그래서 한 번 마음에 든 일이 생기면 끝까지 매달리고, 새벽까지 끊지 못하다가, 다음 날 컨디션과 판단력이 평소의 60%로 떨어지는 패턴이 반복됩니다.

이 사주 사람들이 자주 하는 말 3개:
  · "이거 내가 안 하면 누가 해" (편관+제왕 결합 — 책임을 떠안는 자리)
  · "말로 풀면 풀려" (식상 1위 — 표현이 동력)
  · "조금만 더 다듬으면 될 것 같은데" (식신 + 정사의 정성 — 끝맺음을 미루는 양가성)

진행 중 갑신 편관 대운(31~40세)은 책임과 검증의 시기예요. 식상이 본래 동력이었는데 거기에 관성이 강하게 들어오니, "표현하고 싶은 욕구"와 "책임지고 싶지 않다는 자기 보호"가 같은 자리에서 부딪힙니다. 특히 2026년 병오 세운은 일주 정사와 같은 결의 정·화 기운이라, 외부적으로는 활기차 보이지만 5~9월 사이 한 번은 "내가 이걸 굳이 해야 하나" 회의감이 강하게 올라와요. 이 시기엔 결정을 미루는 게 아니라, 결정의 가짓수를 줄이는 게 핵심이에요.

## 활용 처방
| 상황 | 조심할 점 | 써먹는 법 |
|---|---|---|
| 마음에 든 일 시작할 때 | 새벽까지 못 끊고 다음날 무너짐 | 시작 전에 "오늘은 11시까지" 알람 |
| 단톡방·SNS 자극 들어올 때 | 식상 1위가 자극에 반응 | 평일 21시 이후 알림 일괄 무음 |
| 큰 결정 앞두고 망설일 때 | 양 쏠림 + 정보 과부하 | 하루 한 번 30분 산책으로 수 보강 |
| 친구 고민 들어줄 때 | 가로채고 헤어진 뒤 후회 | 첫 3분은 듣기만, 그 다음 답 |
| 2026년 5~9월 회의감 | "이걸 굳이" 충동적 정리 | 결정 가짓수를 줄이되 끊지 말 것 |

[표현 규칙]
- "정확하다"고 주장하지 말고, 계산된 근거와 현실 장면을 촘촘히 연결해 사용자가 체감하도록 만든다.
- 페르소나 스타일 가이드의 분량·구조·말투를 절대 어기지 마라. 카테고리는 주제일 뿐이고, 톤은 페르소나가 결정한다.`;
}

/**
 * 카테고리별 사전 계산된 핵심 신호. LLM이 놓치기 쉬운 결정적 데이터를
 * userMsg 안에 미리 못박아 넣는다. 현재는 family에 집중 — 무재 사주,
 * 인성/관성 부재, 비겁 개수, 자리 간 충 같은 결정적 신호.
 */
function categoryExtraContext(
  saju: SajuResult,
  category: InterpretationCategory,
): string {
  if (category !== 'family') return '';

  const gender = saju.input.gender;
  const sipsung = saju.sipsung;
  const allValues = Object.values(sipsung).filter(Boolean) as string[];
  const countOf = (...names: string[]) =>
    allValues.filter((v) => names.includes(v)).length;

  const inseong = countOf('정인', '편인'); // 인성 — 어머니
  const jaeseong = countOf('정재', '편재'); // 재성 — 남자=父
  const gwanseong = countOf('정관', '편관'); // 관성 — 남자=자녀 / 여자=남편
  const sikSang = countOf('식신', '상관'); // 식상 — 여자=자녀
  const bigeop = countOf('비견', '겁재'); // 비겁 — 형제

  const lines: string[] = [
    '## 가족 관계 핵심 신호 (사전 계산)',
    `- 사용자 성별: ${gender === 'M' ? '남성' : '여성'}`,
    `- 인성(어머니) ${inseong}개${inseong === 0 ? ' — 母 인연 박함/정서적 결핍 신호' : ''}`,
  ];

  if (gender === 'M') {
    lines.push(
      `- 재성(아버지) ${jaeseong}개${jaeseong === 0 ? ' — ⚠️ 무재 사주: 父와 인연 박함, 일찍 독립 또는 부친 정서적 거리 가능성 높음' : ''}`,
      `- 관성(자녀) ${gwanseong}개${gwanseong === 0 ? ' — 자녀 인연 약함 또는 늦은 자녀운 신호' : ''}`,
    );
  } else {
    lines.push(
      `- 관성(남편) ${gwanseong}개${gwanseong === 0 ? ' — ⚠️ 무관 사주: 남편 인연 박함 또는 늦은 결혼/독신 경향' : ''}`,
      `- 식상(자녀) ${sikSang}개${sikSang === 0 ? ' — 자녀 인연 약함 또는 늦은 자녀운 신호' : ''}`,
      `- 재성(개인 재물·자기 가치) ${jaeseong}개`,
    );
  }

  lines.push(
    `- 비겁(형제·동료) ${bigeop}개${bigeop >= 3 ? ' — ⚠️ 비겁 과다: 형제·동료가 많거나 재물 나누는 구도(군겁쟁재 위험)' : ''}`,
  );

  // 자리 간 충/형 (가족 영역 갈등 신호) — interactions에서 추출.
  const analysis = analyzeSaju(saju);
  const familyPositionsAxis: Array<[string, string, string]> = [
    ['연주', '월주', '부모-자식 갈등'],
    ['월주', '일주', '가족 환경 vs 자기 갈등'],
    ['일주', '시주', '자기 vs 자녀 갈등'],
    ['연주', '일주', '조상 영향 vs 자기 갈등'],
    ['연주', '시주', '부모 vs 자녀(초년·말년 가치관 차이)'],
    ['월주', '시주', '사회·형제 vs 자녀'],
  ];
  const conflicts: string[] = [];
  for (const inter of analysis.interactions) {
    // 가족 갈등은 충/형/파 계열만 보고, 합은 결속 신호라 별도로 봄.
    if (!inter.type.includes('충') && !inter.type.includes('형') && !inter.type.includes('파')) continue;
    for (const [a, b, label] of familyPositionsAxis) {
      const hasA = inter.positions.some((p) => p.includes(a.replace('주', '')));
      const hasB = inter.positions.some((p) => p.includes(b.replace('주', '')));
      if (hasA && hasB) {
        conflicts.push(`${a}-${b} ${inter.type} (${label}): ${inter.detail}`);
        break;
      }
    }
  }
  if (conflicts.length > 0) {
    lines.push('- 자리 간 충/형 (가족 영역 갈등 신호):');
    for (const c of conflicts) lines.push(`  · ${c}`);
  }

  // 공망 — sinsal에서 찾기
  const gongmang = saju.sinsal.filter((s) => s.name?.includes('공망'));
  if (gongmang.length > 0) {
    lines.push(
      `- 공망: ${gongmang.map((s) => `${s.position}(${s.description ?? ''})`).join(', ')}`,
    );
    lines.push(
      '  · 연주 공망 → 부모 인연 박함 / 월주 공망 → 형제·사회 인연 박함 / 시주 공망 → 자녀 인연 약함',
    );
  }

  lines.push(
    '',
    '→ 위 신호들을 반드시 본문에서 인용해 풀어준다. 특히 ⚠️ 표시된 신호는 가족 풀이의 가장 결정적인 신호이므로 빠뜨리지 마라.',
  );

  return lines.join('\n');
}

export async function generateInterpretation(
  saju: SajuResult,
  category: InterpretationCategory,
  name?: string,
  focus?: string,
  persona: PersonaKey = 'dosa',
  /** Supplement-only mode. true면 LLM이 이미 본 본문 뒤에 이어붙일
   *  심화 섹션만 생성한다 (전체 4-섹션 구조 다시 안 씀). */
  supplementMode: boolean = false,
): Promise<{ content: string; tokensUsed: number; model: string }> {
  const cat = INTERPRETATION_CATEGORIES.find((c) => c.key === category);
  if (!cat) throw new Error(`Unknown interpretation category: ${category}`);
  const context = formatSajuContext(saju, name);
  const anchorLines = cat.anchors.map((a) => `- ${a}`).join('\n');
  const extraContext = categoryExtraContext(saju, category);

  const supplementDirective = supplementMode
    ? `

## 보충 응답 모드 (매우 중요)
- 사용자는 이미 이 카테고리의 정식 풀이를 화면에 보고 있다. 이번 응답은 그 뒤에 이어 붙일 "심화: ${focus}" 섹션이다.
- "한 줄 결론:"으로 시작하지 마라.
- 4-섹션 정식 리포트 구조(판독 근거 표 / 체감 체크포인트 / 깊은 풀이 / 활용 처방)를 다시 쓰지 마라.
- 응답 구조 (페르소나 스타일은 유지하되 분량·구조는 다음에 맞춤):
  · 첫 줄: "## 심화 — ${focus ?? '추가 풀이'}" (마크다운 H2 헤딩) — 도사 모드만 사용. 그 외 페르소나는 평문 한 줄 헤드라인.
  · 본문 2-4 단락 (각 4-6 문장). 초점에만 집중해 사주 근거 → 작용 방식 → 현실 장면 → 처방을 한 흐름으로.
  · 끝에 짧은 실행 팁 2-3개 (도사 모드는 마크다운 표 OK, 다른 모드는 평문).
- 전체 분량은 700-1,200자 안팎. 짧고 밀도 있게.`
    : '';

  const userMsg = `다음 사주를 "${cat.title}" 관점에서 깊이 풀이해줘. 현재 모드는 ${persona}.

${context}
${extraContext ? `\n${extraContext}\n` : ''}
중점: ${cat.prompt}

이 카테고리에서 반드시 인용해야 하는 명리 근거(앵커):
${anchorLines}

${focus ? `\n추가 심화 초점: ${focus}\n이 초점을 중심으로 일반론보다 더 구체적인 판독 근거, 위험 신호, 실전 처방을 강화해줘.\n` : ''}${supplementDirective}
작성 요구:
- 페르소나 스타일 가이드의 ${supplementMode ? '말투(어미·한자·술어 사용 정도)' : '구조와 말투'}를 정확히 지킨다.
- 단락마다 위 앵커 중 최소 하나를 실제로 인용하되, 페르소나 톤에 맞게 풀어 쓴다.
- "왜 이 풀이가 나오는지"가 매 단락에서 느껴져야 한다.
- 사용자가 체감으로 검증할 수 있는 행동/감정 장면을 ${supplementMode ? '최소 2개' : '최소 3개'} 포함한다.
- 컨텍스트에 없는 글자/합·충·신살은 만들어내지 않는다.${extraContext ? '\n- 위 "## 가족 관계 핵심 신호"의 ⚠️ 신호는 반드시 본문에서 풀어준다.' : ''}`;
  return complete({
    tier: 'saju',
    system: buildSystem(persona),
    messages: [{ role: 'user', content: userMsg }],
    maxTokens: supplementMode
      ? Math.min(2400, PERSONA_MAX_TOKENS[persona])
      : PERSONA_MAX_TOKENS[persona],
    temperature: persona === 'kkobuk' || persona === 'bosal' ? 0.6 : 0.45,
  }).then((r) => ({
    content: r.text,
    tokensUsed: r.tokensUsed,
    model: r.model,
  }));
}

function strongestOhaeng(saju: SajuResult) {
  return Object.entries(saju.ohaengCount).sort((a, b) => b[1] - a[1])[0] as [
    string,
    number,
  ];
}

function weakestOhaeng(saju: SajuResult) {
  return Object.entries(saju.ohaengCount).sort((a, b) => a[1] - b[1])[0] as [
    string,
    number,
  ];
}

function categoryAngle(category: InterpretationCategory): {
  title: string;
  focus: string;
  scene: string;
  prescription: string;
} {
  const map: Partial<
    Record<
      InterpretationCategory,
      {
        title: string;
        focus: string;
        scene: string;
        prescription: string;
      }
    >
  > = {
    overview: {
      title: '총평',
      focus: '삶 전체를 움직이는 기본 온도와 중심 테마',
      scene: '선택의 순간마다 어떤 기운이 먼저 튀어나오는지',
      prescription: '강한 기운은 일의 동력으로 쓰고 빈 기운은 루틴으로 보완',
    },
    ohaeng: {
      title: '오행 균형',
      focus: '목화토금수의 많고 적음이 만든 체감 온도',
      scene: '컨디션, 관계, 일 처리 속도에서 반복되는 리듬',
      prescription: '부족한 오행을 색, 장소, 사람, 습관으로 보강',
    },
    ilju: {
      title: '일주 분석',
      focus: '일간과 일지가 보여주는 본질과 사랑 방식',
      scene: '자존심, 친밀감, 선택 기준이 드러나는 장면',
      prescription: '일주의 장점은 살리고 예민한 반응은 늦춰 보기',
    },
    strength: {
      title: '타고난 장점',
      focus: '이미 잘하는 능력과 자연스럽게 빛나는 역할',
      scene: '남들이 맡기고 싶어 하는 일과 인정받는 방식',
      prescription: '강점을 의식적으로 반복 가능한 구조로 만들기',
    },
    weakness: {
      title: '경계할 점',
      focus: '과하거나 비어 있는 기운이 만드는 취약한 패턴',
      scene: '피곤할 때 말, 돈, 관계, 선택에서 나타나는 흔들림',
      prescription: '약점을 고치기보다 먼저 알아차리는 장치를 만들기',
    },
    personality: {
      title: '성격',
      focus: '겉으로 보이는 태도와 속마음의 차이',
      scene: '감정을 처리하고 사람을 대하는 기본 방식',
      prescription: '설명하지 않아도 오해가 줄어드는 표현 습관 만들기',
    },
    career: {
      title: '직업과 적성',
      focus: '잘 맞는 일의 구조와 성과가 나는 환경',
      scene: '조직, 독립, 전문성, 표현력 중 어디서 힘이 나는지',
      prescription: '기운이 살아나는 업무 비율을 점점 늘리기',
    },
    wealth: {
      title: '재물운',
      focus: '돈을 모으고 쓰고 지키는 반복 패턴',
      scene: '수입보다 지출 판단과 안정감에서 드러나는 습관',
      prescription: '감정 소비를 줄이고 돈의 흐름을 보이는 곳에 두기',
    },
    love: {
      title: '연애와 결혼',
      focus: '끌리는 사람과 편안한 관계의 차이',
      scene: '확신을 받고 싶을 때와 거리를 두고 싶을 때의 반응',
      prescription: '상대에게 바라는 것을 비난보다 요청으로 말하기',
    },
    family: {
      title: '가족 관계',
      focus: '가족 안에서 맡기 쉬운 역할과 거리감',
      scene: '책임감, 기대, 서운함이 쌓이는 방식',
      prescription: '가족과 나 사이의 경계를 부드럽게 세우기',
    },
    friends: {
      title: '대인관계',
      focus: '친구와 동료에게 비치는 인상과 관계 운',
      scene: '도움이 되는 사람과 에너지를 빼는 사람을 구분하는 감각',
      prescription: '좋은 인연은 자주 확인하고 무거운 인연은 간격 조절',
    },
    direction: {
      title: '좋은 방향',
      focus: '기운을 보완하는 색, 환경, 방향, 루틴',
      scene: '막힐 때 몸과 마음이 다시 풀리는 생활 조건',
      prescription: '작은 환경 조정으로 부족한 기운을 꾸준히 채우기',
    },
  };
  return map[category] ?? map.overview!;
}

function sipsungSummary(saju: SajuResult): string {
  const entries = Object.entries(saju.sipsung)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .slice(0, 4);
  return entries.map(([, value]) => value).join(', ') || '십성 미상';
}

export function generateFallbackInterpretation(
  saju: SajuResult,
  category: InterpretationCategory,
  name?: string,
  focus?: string,
): { content: string; tokensUsed: number; model: string } {
  const cat = categoryAngle(category);
  const [strong, strongCount] = strongestOhaeng(saju);
  const [weak, weakCount] = weakestOhaeng(saju);
  const { palja } = saju;
  const timePillar = palja.time
    ? `${palja.time.ganHanja}${palja.time.jiHanja}(${palja.time.gan}${palja.time.ji})`
    : '시주 미상';
  const sinsal = saju.sinsal.slice(0, 3);
  const sinsalText =
    sinsal.length > 0
      ? sinsal.map((item) => `${item.name}(${item.position})`).join(', ')
      : '두드러진 주요 신살은 약하게 작용';
  const daewoon = saju.daewoon[0];
  const daewoonText = daewoon
    ? `${daewoon.startAge}세부터 ${daewoon.pillar.ganHanja}${daewoon.pillar.jiHanja} 대운`
    : '대운 정보는 계산 대기';
  const displayName = name?.trim() || '사용자';

  const focusLine = focus ? ` 이번 심화 초점은 “${focus}”입니다.` : '';
  const content = `한 줄 결론: ${displayName}님의 ${cat.title}은 ${strong} 기운이 강하게 체감되고, ${weak} 기운을 의식적으로 보완할 때 균형이 좋아지는 구조입니다. ${cat.focus}을 볼 때 핵심은 일주 ${palja.day.ganHanja}${palja.day.jiHanja}(${palja.day.gan}${palja.day.ji})와 오행 분포의 온도 차이를 함께 읽는 것입니다.${focusLine}

## 판독 근거 표
| 사주 근거 | 작용 방식 | 현실 체감 |
|---|---|---|
| 일주 ${palja.day.ganHanja}${palja.day.jiHanja} | 나의 중심 기질 | 선택 기준과 자존심에 반영 |
| 월주 ${palja.month.ganHanja}${palja.month.jiHanja} | 사회적 리듬 | 일과 관계의 기본 속도 |
| 오행 ${strong} ${strongCount}개 | 강한 체감 온도 | 익숙한 방식으로 먼저 반응 |
| 오행 ${weak} ${weakCount}개 | 보완 지점 | 지치면 결핍으로 드러남 |
| 십성 ${sipsungSummary(saju)} | 역할과 욕구 | 인정받는 방식에 영향 |
| ${sinsalText} | 반복되는 사건성 | 장점과 주의점이 함께 작용 |

## 체감 체크포인트
- ${cat.scene}에서 ${strong} 기운의 속도가 먼저 올라오는 편입니다.
- ${weak} 기운이 약해질수록 판단이 한쪽으로 몰리거나 피로가 빨리 쌓일 수 있습니다.
- 일간 ${saju.ilgan}은 관계에서 “내가 납득해야 움직이는 기준”을 강하게 만듭니다.
- 월지 ${palja.month.jiHanja}(${palja.month.ji})는 사회생활에서 반복되는 감정 온도를 보여줍니다.
- ${timePillar}는 후반부 선택과 생활 리듬을 해석할 때 함께 보아야 합니다.

## 깊은 풀이
${displayName}님의 원국은 연주 ${palja.year.ganHanja}${palja.year.jiHanja}, 월주 ${palja.month.ganHanja}${palja.month.jiHanja}, 일주 ${palja.day.ganHanja}${palja.day.jiHanja}의 조합으로 읽습니다. 여기서 ${strong} 기운이 ${strongCount}개로 가장 강하고 ${weak} 기운은 ${weakCount}개라, 타고난 반응 방식과 실제로 필요한 보완 방식 사이에 차이가 생깁니다. 이 차이가 바로 ${cat.title}에서 반복적으로 느껴지는 핵심 패턴입니다.

십성 흐름은 ${sipsungSummary(saju)} 쪽으로 힘이 모입니다. 십성은 사람의 욕구와 역할을 보여주는 장치라서, 같은 사건을 만나도 어떤 사람은 인정 욕구로, 어떤 사람은 책임감으로, 또 어떤 사람은 표현 욕구로 반응합니다. ${displayName}님은 이 십성 조합 때문에 ${cat.focus}에서 “내가 잘하는 방식”과 “무리하면 흔들리는 방식”이 비교적 분명하게 갈립니다.

신살은 운을 단정하는 표식이라기보다 특정 장면이 반복되는 힌트로 보아야 합니다. ${sinsalText}가 보이면 관계, 일, 감정의 한 장면에서 같은 숙제가 반복될 수 있습니다. 그래서 이 리포트의 핵심은 좋고 나쁨을 가르는 것이 아니라, 반복되는 장면을 먼저 알아차려 선택지를 넓히는 데 있습니다.

대운은 ${daewoonText}처럼 10년 단위의 큰 환경을 보여줍니다. 지금 당장 모든 변화가 한 번에 오지는 않지만, 강한 ${strong} 기운을 생산적인 방향으로 쓰고 부족한 ${weak} 기운을 생활 속에서 채우면 ${cat.title}의 체감 정확도가 훨씬 높아집니다.

## 활용 처방
| 상황 | 조심할 점 | 써먹는 법 |
|---|---|---|
| 결정이 급할 때 | ${strong} 기운으로 과속 | 하루 뒤 다시 확인 |
| 관계가 예민할 때 | ${weak} 기운 결핍 투사 | 요구를 짧게 말하기 |
| 일이 막힐 때 | 익숙한 방식만 반복 | 다른 오행의 환경 빌리기 |
| 컨디션 저하 | 원국의 한쪽 쏠림 | 수면과 루틴 먼저 회복 |
| 운이 바뀌는 시기 | 성급한 단정 | 대운과 세운을 함께 보기 |

${cat.prescription}.`;

  return {
    content,
    tokensUsed: 0,
    model: 'local-fallback',
  };
}

export async function generateAllInterpretations(
  saju: SajuResult,
  name?: string,
  persona: PersonaKey = 'dosa',
): Promise<
  Array<{
    category: InterpretationCategory;
    content: string;
    tokensUsed: number;
    model: string;
  }>
> {
  const results = await Promise.all(
    INTERPRETATION_CATEGORIES.map(async (cat) => {
      const r = await generateInterpretation(saju, cat.key, name, undefined, persona);
      return {
        category: cat.key,
        content: r.content,
        tokensUsed: r.tokensUsed,
        model: r.model,
      };
    }),
  );
  return results;
}
