import { complete } from '@/lib/llm/client';

export interface ExtractedBirthInfo {
  /** 사주 계산에 충분한 정보(생년월일+성별)가 있으면 true. */
  found: boolean;
  /** 'YYYY-MM-DD' */
  birthDate: string | null;
  /** 'HH:MM' (24시간) — 모르면 null. */
  birthTime: string | null;
  isLunar: boolean;
  isLeapMonth: boolean;
  gender: 'M' | 'F' | null;
  name: string | null;
  /** found=false 일 때 무엇이 빠졌는지(사용자에게 되물을 때 사용). */
  missing: Array<'birthDate' | 'gender'>;
}

const SYSTEM = `너는 한국어 자유 발화에서 사주 계산용 출생 정보를 추출하는 파서다.
사용자의 문장에서 생년월일·태어난 시각·양력/음력·성별·이름을 뽑아 JSON 으로만 답한다.

규칙:
- 생년월일은 'YYYY-MM-DD'. 두 자리 연도(예: 90년)는 1900~2025 범위로 합리적 추정(90→1990, 05→2005).
- 시각은 24시간 'HH:MM'. "오후 2시"=14:00, "밤 11시"=23:00, "새벽 1시"=01:00, "낮 12시"=12:00, "밤 12시/자정"=00:00.
  "시간 모름/몰라/모르겠"이면 birthTime=null.
- 양력이 기본(isLunar=false). "음력"이라고 명시할 때만 isLunar=true. "윤달"이면 isLeapMonth=true.
- 성별: "남/남자/남성/형/오빠"→"M", "여/여자/여성/누나/언니"→"F". 불명확하면 null.
- 이름이 분명히 보이면 name, 아니면 null.
- 생년월일이 없거나 성별이 없으면 found=false 로 두고, missing 에 빠진 항목을 넣는다.

반드시 아래 형식의 JSON 객체 하나만 출력(설명·코드블록 금지):
{"found":boolean,"birthDate":string|null,"birthTime":string|null,"isLunar":boolean,"isLeapMonth":boolean,"gender":"M"|"F"|null,"name":string|null,"missing":string[]}`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/**
 * 자유 발화에서 출생 정보를 추출한다. 한국어 날짜 표현이 다양해 정규식보다
 * 싸구려 모델 추출이 견고하다. 모델/파싱 실패 시 found=false 로 안전 폴백.
 */
export async function extractBirthInfo(
  utterance: string,
): Promise<ExtractedBirthInfo> {
  const empty: ExtractedBirthInfo = {
    found: false,
    birthDate: null,
    birthTime: null,
    isLunar: false,
    isLeapMonth: false,
    gender: null,
    name: null,
    missing: ['birthDate', 'gender'],
  };

  if (!utterance.trim()) return empty;

  try {
    const { text } = await complete({
      tier: 'cheap',
      system: SYSTEM,
      messages: [{ role: 'user', content: utterance.slice(0, 500) }],
      maxTokens: 300,
      responseFormat: 'json_object',
      temperature: 0,
    });

    const raw = JSON.parse(text) as Partial<ExtractedBirthInfo>;

    const birthDate =
      typeof raw.birthDate === 'string' && DATE_RE.test(raw.birthDate)
        ? raw.birthDate
        : null;
    const birthTime =
      typeof raw.birthTime === 'string' && TIME_RE.test(raw.birthTime)
        ? raw.birthTime
        : null;
    const gender =
      raw.gender === 'M' || raw.gender === 'F' ? raw.gender : null;

    // 충분조건: 생년월일 + 성별. 시각은 선택(미상 사주도 유효).
    const missing: Array<'birthDate' | 'gender'> = [];
    if (!birthDate) missing.push('birthDate');
    if (!gender) missing.push('gender');

    return {
      found: missing.length === 0,
      birthDate,
      birthTime,
      isLunar: raw.isLunar === true,
      isLeapMonth: raw.isLeapMonth === true,
      gender,
      name:
        typeof raw.name === 'string' && raw.name.trim()
          ? raw.name.trim().slice(0, 20)
          : null,
      missing,
    };
  } catch {
    return empty;
  }
}
