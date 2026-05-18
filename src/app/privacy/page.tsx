import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보 처리방침',
  description: '꼬북점 개인정보 처리방침',
  alternates: { canonical: '/privacy' },
};

const sections = [
  {
    title: '수집하는 정보',
    body: '꼬북점은 사주 풀이와 인연 분석을 제공하기 위해 이름 또는 별칭, 생년월일시, 성별, 관계 정보, 로그인 식별자, 결제 처리에 필요한 거래 상태, 서비스 이용 기록을 처리할 수 있습니다.',
  },
  {
    title: '이용 목적',
    body: '입력한 정보는 사주 원국 계산, 운세·궁합·대운·인연지도 생성, AI 상세 풀이, 유료 크레딧 관리, 고객 문의 대응, 부정 이용 방지에 사용됩니다.',
  },
  {
    title: '보관 및 삭제',
    body: '회원이 직접 등록한 인물과 인연 정보는 앱 내 삭제 기능으로 삭제할 수 있습니다. 계정 삭제 또는 고객 문의가 접수되면 관계 법령상 보관이 필요한 정보를 제외하고 지체 없이 삭제합니다.',
  },
  {
    title: '제3자 서비스',
    body: '로그인에는 Supabase와 카카오 인증이, 결제에는 카카오페이가, AI 생성에는 OpenRouter 또는 OpenAI API가 사용될 수 있습니다. 각 서비스에는 처리 목적에 필요한 최소한의 정보만 전달됩니다.',
  },
  {
    title: '문의',
    body: '개인정보 관련 문의는 서비스 운영자에게 이메일 또는 앱 내 문의 채널로 요청할 수 있습니다. 문의가 접수되면 확인 후 필요한 조치를 안내합니다.',
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-12 text-ink">
      <header className="space-y-3">
        <p className="text-sm font-black text-mint-dark">꼬북점</p>
        <h1 className="text-3xl font-black">개인정보 처리방침</h1>
        <p className="text-sm font-bold text-muted">시행일: 2026년 5월 18일</p>
      </header>

      <section className="rounded-[28px] border border-line bg-soft/90 p-6 shadow-sm">
        <p className="text-base font-bold leading-8 text-muted">
          꼬북점은 사용자가 입력한 사주 정보를 안전하게 처리하고, 서비스 제공에
          필요한 범위 안에서만 개인정보를 사용합니다.
        </p>
      </section>

      <div className="space-y-4">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-[24px] border border-line bg-white/88 p-6"
          >
            <h2 className="text-xl font-black">{section.title}</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-muted">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
