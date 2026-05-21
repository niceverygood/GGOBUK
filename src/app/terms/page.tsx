import type { Metadata } from 'next';
import { COMPANY, PAYMENT_POLICY } from '@/lib/company';

export const metadata: Metadata = {
  title: '이용약관',
  description: '꼬북점 서비스 이용약관',
  alternates: { canonical: '/terms' },
};

const sections = [
  {
    title: '제1조 (서비스 성격)',
    body: '꼬북점은 사주, 운세, 궁합, 인연 분석을 엔터테인먼트와 자기이해 목적으로 제공하는 서비스입니다. 결과는 전문 의료, 법률, 금융, 심리 상담을 대체하지 않습니다.',
  },
  {
    title: '제2조 (회원 정보 관리)',
    body: '사용자는 본인 및 지인의 생년월일시를 정확하게 입력해야 하며, 타인의 정보를 등록할 때에는 필요한 동의를 직접 확보해야 합니다.',
  },
  {
    title: '제3조 (유료 크레딧 — 꼬북알)',
    body: '꼬북알은 AI 상세 풀이, 부적 이미지 생성, 프리미엄 운세 등 앱 내 디지털 기능 이용에 사용되는 충전형 포인트입니다. 가격은 결제 화면에 부가가치세 포함가로 표시됩니다.',
  },
  {
    title: '제4조 (결제 수단)',
    body: `결제는 ${PAYMENT_POLICY.method}으로 ${PAYMENT_POLICY.currency} 기준으로 이루어집니다. ${PAYMENT_POLICY.noAutoBilling}`,
  },
  {
    title: '제5조 (청약철회 및 환불)',
    body: `${PAYMENT_POLICY.refundSummary} 환불 신청은 ${COMPANY.contactEmail} 또는 앱 내 고객문의로 접수하며, 영업일 기준 3일 이내에 처리합니다. 회사의 귀책 사유로 콘텐츠 이용이 불가한 경우에는 전액 환불합니다.`,
  },
  {
    title: '제6조 (금지 행위)',
    body: '서비스 악용, 자동화된 과도한 호출, 타인의 개인정보 무단 입력, 결과물의 무단 대량 복제, 서비스 운영을 방해하는 행위를 금지합니다.',
  },
  {
    title: '제7조 (책임의 한계)',
    body: '꼬북점이 제공하는 운세·궁합·풀이는 참고용 정보이며, 이를 근거로 한 사용자의 의사결정과 그 결과에 대해 회사는 법령이 허용하는 범위에서 책임을 지지 않습니다.',
  },
  {
    title: '제8조 (약관 변경)',
    body: '서비스 운영상 필요한 경우 약관이 변경될 수 있으며, 중요한 변경은 시행 7일 전(이용자에게 불리한 변경은 30일 전) 앱 또는 웹사이트를 통해 안내합니다.',
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-12 text-ink">
      <header className="space-y-3">
        <p className="text-sm font-black text-mint-dark">꼬북점</p>
        <h1 className="text-3xl font-black">이용약관</h1>
        <p className="text-sm font-bold text-muted">시행일: 2026년 5월 18일</p>
      </header>

      <section className="rounded-[28px] border border-line bg-soft/90 p-6 shadow-sm">
        <p className="text-base font-bold leading-8 text-muted">
          꼬북점 이용자는 본 약관에 동의한 뒤 서비스를 이용할 수 있습니다.
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

      <section className="rounded-[24px] border border-line bg-white/88 p-6">
        <h2 className="text-xl font-black">사업자 정보</h2>
        <dl className="mt-3 space-y-1.5 text-sm font-semibold text-muted">
          <Row k="상호" v={COMPANY.name} />
          <Row k="대표자" v={COMPANY.ceo} />
          <Row k="사업자등록번호" v={COMPANY.bizRegNo} />
          <Row k="통신판매업신고" v={COMPANY.mailOrderNo} />
          <Row k="주소" v={COMPANY.address} />
          <Row k="고객문의" v={COMPANY.contactEmail} />
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
