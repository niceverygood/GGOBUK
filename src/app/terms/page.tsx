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
    body: '꼬북점은 사주, 운세, 궁합, 인연 분석과 — 회원이 선택적으로 이용하는 — 이용자 간 인연 매칭 및 메시지(채팅) 기능을 엔터테인먼트와 자기이해 목적으로 제공하는 서비스입니다. 모든 결과와 매칭은 참고용이며, 전문 의료, 법률, 금융, 심리 상담이나 중매·결혼중개를 대체하지 않습니다.',
  },
  {
    title: '제2조 (회원 정보 관리)',
    body: '사용자는 본인 및 지인의 생년월일시를 정확하게 입력해야 하며, 타인의 정보를 등록할 때에는 필요한 동의를 직접 확보해야 합니다. 계정과 로그인 정보의 관리 책임은 회원에게 있습니다.',
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
    title: '제6조 (인연 매칭 서비스)',
    body: '회사는 회원의 사주·궁합을 기반으로 다른 회원을 추천하거나 상호 연결하는 인연 매칭 기능(예: 궁합이 맞는 친구·연인 찾기)을 제공할 수 있습니다. 매칭 기능은 별도의 동의를 한 회원에 한해 제공되는 선택적 기능이며, 동의하지 않으면 회원의 정보는 다른 회원에게 노출되지 않고 매칭 대상에서 제외됩니다. 매칭 시 상대 회원에게 공개되는 정보의 범위와 동의 절차는 개인정보 처리방침에 따릅니다. 회사는 매칭의 정확성·성사·상대 회원의 신원이나 진실성을 보증하지 않으며, 결혼중개·만남주선업에 해당하는 오프라인 만남의 주선이나 알선은 제공하지 않습니다.',
  },
  {
    title: '제7조 (메시지·채팅 서비스)',
    body: '매칭으로 상호 연결된 회원은 앱 내 메시지(채팅) 기능을 이용할 수 있습니다. 채팅은 회원 간 자율적 소통 수단이며, 회사는 통신의 단순 매개자입니다. 회원은 채팅에서 상대를 존중해야 하고, 회사는 신고된 메시지 또는 법령·본 약관 위반이 의심되는 메시지를 확인·삭제하거나 발신 회원의 이용을 제한할 수 있습니다. 회원은 언제든지 상대를 차단하거나 신고할 수 있습니다.',
  },
  {
    title: '제8조 (이용자 행동 규범 및 금지 행위)',
    body: '회원은 다음 행위를 하여서는 안 됩니다: ① 서비스 악용·자동화된 과도한 호출·결과물의 무단 대량 복제·운영 방해, ② 타인의 개인정보 무단 입력·수집·이용, ③ 매칭·채팅에서 상대에 대한 성희롱·욕설·협박·차별·스토킹·명예훼손, ④ 금전·투자·종교·다단계 권유 등 상업적·기망적 목적의 접근, ⑤ 타인 사칭 또는 허위 프로필 작성, ⑥ 미성년자를 대상으로 한 부적절한 접근, ⑦ 음란물·불법정보의 전송, ⑧ 채팅 상대의 연락처·금융정보·신체정보 등 민감정보를 부당하게 요구하는 행위.',
  },
  {
    title: '제9조 (신고·차단·이용 제한)',
    body: '회사는 회원의 신고 또는 모니터링을 통해 본 약관 또는 법령 위반이 확인되거나 합리적으로 의심되는 경우, 사전 통지 없이 해당 콘텐츠 삭제, 매칭·채팅 기능 일부 또는 전부의 제한, 계정 일시 정지 또는 영구 이용 정지 등의 조치를 취할 수 있습니다. 긴급한 위해가 우려되는 경우 즉시 조치 후 사후 통지할 수 있습니다.',
  },
  {
    title: '제10조 (미성년자 보호)',
    body: '만 14세 미만은 회원으로 가입할 수 없습니다. 인연 매칭 및 채팅 기능은 안전을 위해 만 19세 이상 회원에게 제공하는 것을 원칙으로 하며, 회사는 청소년 보호를 위해 매칭 대상·노출 범위를 제한할 수 있습니다. 회원은 가입 및 매칭 이용 시 본인의 연령 정보가 정확함을 보증합니다.',
  },
  {
    title: '제11조 (책임의 한계)',
    body: '꼬북점이 제공하는 운세·궁합·풀이는 참고용 정보이며, 이를 근거로 한 사용자의 의사결정과 그 결과에 대해 회사는 법령이 허용하는 범위에서 책임을 지지 않습니다. 또한 회사는 회원 간 매칭·채팅 과정에서 발생하는 회원 상호 간의 분쟁, 상대 회원이 제공한 정보의 진실성, 회원 간의 거래나 오프라인 만남 및 그로 인한 손해에 대하여 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다. 회원은 낯선 상대와의 소통 및 만남에 스스로 주의를 기울여야 합니다.',
  },
  {
    title: '제12조 (약관 변경)',
    body: '서비스 운영상 필요한 경우 약관이 변경될 수 있으며, 중요한 변경은 시행 7일 전(이용자에게 불리한 변경은 30일 전) 앱 또는 웹사이트를 통해 안내합니다. 매칭·채팅 등 신규 기능이 실제로 출시되는 시점에는 해당 기능에 대한 별도 동의를 받습니다.',
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-12 text-ink">
      <header className="space-y-3">
        <p className="text-sm font-black text-mint-dark">꼬북점</p>
        <h1 className="text-3xl font-black">이용약관</h1>
        <p className="text-sm font-bold text-muted">시행일: 2026년 5월 28일</p>
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
