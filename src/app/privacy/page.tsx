import type { Metadata } from 'next';
import { COMPANY } from '@/lib/company';

export const metadata: Metadata = {
  title: '개인정보 처리방침',
  description: '꼬북점 개인정보 처리방침',
  alternates: { canonical: '/privacy' },
};

const EFFECTIVE_DATE = '2026년 5월 28일';

const sections: { title: string; body: string | string[] }[] = [
  {
    title: '1. 수집하는 정보 항목',
    body: [
      '계정 식별 정보: Supabase 사용자 ID, 카카오 로그인 식별자 또는 Apple Sign-In identityToken, 표시 이름(별칭), 이메일(Apple 로그인 시 사용자가 공개를 선택한 경우에 한함).',
      '사주 입력 정보: 사용자 본인과 등록한 인연의 이름(또는 별칭), 생년월일, 출생 시각(미상 가능), 성별, 음양력·윤달 여부, 관계 유형·라벨.',
      '서비스 이용 정보: 채팅 세션·메시지 본문, 풀이 카테고리, 페르소나 모드, 결제(카카오페이) 거래 상태·구독 만료 시각, 푸시 토큰·알림 시각, 일일 사용량 카운터.',
      '자동 수집 정보: 접속 시간, IP 주소(추적 목적 미사용·요청 처리에 한해 일시 보관), 디바이스 OS, 발생한 오류 메시지 및 스택 트레이스(Sentry 사용 시).',
    ],
  },
  {
    title: '2. 정보 수집 방법',
    body: [
      '회원이 직접 입력 (사주 등록·인연 등록·채팅·결제).',
      '제3자 인증(카카오·Apple)에서 OAuth 콜백을 통해 식별자·표시 이름 수신.',
      '서비스 동작 중 자동 발생 로그(요청·오류·푸시 구독).',
    ],
  },
  {
    title: '3. 이용 목적',
    body: [
      '사주 원국 계산, 12개 카테고리 풀이 생성, 대운·세운·궁합·길일·웹툰·부적 생성.',
      'AI 페르소나 채팅(꼬북/도사/무당/보살)의 답변 생성.',
      '결제 및 구독 상태 관리, 사용량 제한 적용.',
      '서비스 운영, 부정 이용 방지, 고객 문의 대응.',
    ],
  },
  {
    title: '4. AI 서비스(제3자) 제공 및 동의',
    body: [
      '꼬북점은 풀이·채팅·궁합·길일·웹툰·부적 생성을 위해 미국 Anthropic, PBC 의 Claude API(claude-sonnet, claude-haiku, 이미지 생성 API 포함)와 — 일부 기능에 한해 — OpenRouter Inc. 의 라우팅 API 및 OpenAI, L.L.C. 의 이미지 모델에 사용자 입력을 전송합니다.',
      '전송되는 정보: 사용자가 입력한 이름·별칭·생년월일·출생시·성별·관계 라벨, 사주 계산 결과(팔자·오행·십성), 채팅 메시지 본문 및 직전 20개 이내의 대화 맥락, 풀이 카테고리·페르소나 식별자.',
      '전송되지 않는 정보: 이메일 주소, 카카오/Apple 식별자, 결제 정보, 푸시 토큰, IP 주소, 디바이스 정보.',
      '동의 절차: 로그인 후 최초 진입 시 별도의 동의 모달을 통해 위 정보가 Anthropic 등 외부 AI 서비스로 전송됨을 고지하고 명시적 동의를 받습니다. 동의 전에는 AI 호출이 차단되며, 동의 시각은 사용자 레코드의 ai_consent_at 컬럼에 기록됩니다. 사용자는 언제든지 앱 내 설정에서 동의를 철회할 수 있고, 철회 시 즉시 AI 기능이 비활성화됩니다.',
      '국외 이전: 전송 대상 서버는 미국에 위치합니다. Anthropic 은 자체 약관 및 Data Processing Addendum 에서 모델 학습 미사용·30일 운영 로그 보관·SOC 2 Type II 보안 통제를 제공하며, 꼬북점은 본 개인정보 처리방침에서 약속한 보호 수준에 상응하는 보호를 외부 처리자에게 동등하게 요구합니다.',
    ],
  },
  {
    title: '5. 보관 기간 및 파기',
    body: [
      '회원 활동 정보: 회원 탈퇴 또는 사용자의 삭제 요청 시 즉시 파기.',
      '결제 및 거래 기록: 전자상거래법에 따라 5년간 보관 후 파기.',
      '소비자 불만·분쟁 기록: 전자상거래법에 따라 3년간 보관.',
      '서버 접근 로그(IP·오류): 90일 후 자동 삭제.',
      'Anthropic 측 처리 로그: Anthropic 정책에 따라 최대 30일 보관 후 삭제.',
    ],
  },
  {
    title: '6. 회원 탈퇴 및 계정 삭제',
    body: [
      '앱 내 설정 → "계정 삭제" 메뉴에서 직접 계정을 영구 삭제할 수 있습니다.',
      '삭제 시 사용자 인증 정보, 사주 프로필, 등록한 인연, 채팅 세션·메시지, 풀이·웹툰·부적 생성물, 구독 정보, 푸시 토큰, AI 동의 기록 등 본 서비스에 보관된 모든 개인정보가 즉시 영구 삭제됩니다.',
      '법령상 보관 의무가 있는 거래 기록은 별도 보관 후 보관 기간 만료 시 파기합니다.',
      '문의를 통한 삭제는 dev@bottlecorp.kr 로도 요청 가능하지만, 앱 내 삭제 기능이 기본 경로입니다.',
    ],
  },
  {
    title: '7. 이용자의 권리',
    body: [
      '개인정보 열람·정정·삭제·처리 정지 요청 권리가 있습니다.',
      '동의 철회(AI 사용 동의·푸시 알림 등)는 앱 내 설정에서 즉시 가능합니다.',
      '제3자 제공·국외 이전 거부 권리: AI 동의를 철회하면 외부 AI 서비스로의 데이터 전송이 중단됩니다(이 경우 AI 기반 기능은 사용할 수 없습니다).',
    ],
  },
  {
    title: '8. 사용하는 외부 서비스 (수탁자) 목록',
    body: [
      'Supabase Inc. — 인증·데이터베이스·세션 저장.',
      'Vercel Inc. — 웹·API 호스팅, CDN, 로그.',
      'Kakao Corp. — 카카오 로그인 OAuth.',
      'Apple Inc. — Sign in with Apple OAuth.',
      'Anthropic, PBC — Claude 텍스트 및 이미지 모델 API.',
      'OpenRouter Inc. — 모델 라우팅(선택적, 환경변수 설정 시).',
      'OpenAI, L.L.C. — 이미지 생성 모델(웹툰·부적).',
      'Kakao Pay — 결제(국내 카드/계좌).',
    ],
  },
  {
    title: '9. 보안 조치',
    body: [
      '인증·세션은 Supabase Auth(HTTPS, JWT) 로 처리.',
      'Row Level Security 로 사용자별 데이터 격리.',
      '외부 전송은 TLS 1.2 이상.',
      'service-role 키는 서버 환경변수로만 보관, 클라이언트 노출 차단.',
    ],
  },
  {
    title: '10. 고지 의무',
    body: '본 방침의 중요한 변경 시 앱 내 공지 또는 푸시 알림을 통해 최소 7일 전(이용자에게 불리한 변경은 30일 전) 사전 고지합니다.',
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-12 text-ink">
      <header className="space-y-3">
        <p className="text-sm font-black text-mint-dark">꼬북점</p>
        <h1 className="text-3xl font-black">개인정보 처리방침</h1>
        <p className="text-sm font-bold text-muted">시행일: {EFFECTIVE_DATE}</p>
      </header>

      <section className="rounded-[28px] border border-line bg-soft/90 p-6 shadow-sm">
        <p className="text-base font-bold leading-8 text-muted">
          꼬북점(이하 &ldquo;서비스&rdquo;)은 사용자가 입력한 사주 정보를
          안전하게 처리하고, 서비스 제공에 필요한 범위 안에서만 개인정보를
          사용합니다. AI 풀이를 만들기 위해 외부 AI 서비스에 일부 정보가
          전송되며, 본 방침의 제4조에서 어떤 정보가 누구에게 어떤 목적으로
          전송되는지 상세히 안내합니다.
        </p>
      </section>

      <div className="space-y-4">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-[24px] border border-line bg-white/88 p-6"
          >
            <h2 className="text-xl font-black">{section.title}</h2>
            {Array.isArray(section.body) ? (
              <ul className="mt-3 space-y-2 text-sm font-semibold leading-7 text-muted">
                {section.body.map((line, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span aria-hidden className="text-mint-dark">
                      •
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm font-semibold leading-7 text-muted">
                {section.body}
              </p>
            )}
          </section>
        ))}
      </div>

      <section className="rounded-[24px] border border-line bg-white/88 p-6">
        <h2 className="text-xl font-black">개인정보 보호책임자 / 사업자 정보</h2>
        <dl className="mt-3 space-y-1.5 text-sm font-semibold text-muted">
          <Row k="상호" v={COMPANY.name} />
          <Row k="대표자" v={COMPANY.ceo} />
          <Row k="보호책임자" v={`${COMPANY.ceo} (${COMPANY.contactEmail})`} />
          <Row k="사업자등록번호" v={COMPANY.bizRegNo} />
          <Row k="주소" v={COMPANY.address} />
          <Row k="문의" v={COMPANY.contactEmail} />
        </dl>
      </section>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 font-black text-ink">{k}</dt>
      <dd className="flex-1">{v}</dd>
    </div>
  );
}
