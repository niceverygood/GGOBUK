import { redirect } from 'next/navigation';
import Link from 'next/link';
import { checkAdmin } from '@/lib/admin';
import { createServerClient } from '@/lib/supabase/server';
import { formatKrw, CREDIT_UNIT } from '@/lib/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Overview {
  users_total: number;
  users_today: number;
  users_7d: number;
  profiles_total: number;
  profiles_self: number;
  chat_sessions: number;
  chat_messages: number;
  interpretations: number;
  relations: number;
  daily_fortunes: number;
  paid_count: number;
  revenue_krw: number;
  revenue_today_krw: number;
  credits_issued: number;
  credits_spent: number;
  credit_balance_total: number;
}

interface PurchaseRow {
  id: string;
  package_id: string;
  amount: number;
  credits: number;
  bonus_credits: number;
  status: string;
  approved_at: string | null;
  created_at: string;
}

interface SignupRow {
  id: string;
  nickname: string | null;
  credit_balance: number | null;
  is_admin: boolean | null;
  created_at: string;
}

function num(v: number | null | undefined): string {
  return new Intl.NumberFormat('ko-KR').format(Number(v ?? 0));
}

export default async function AdminPage() {
  const { isAdmin, userId, email, needsSetup } = await checkAdmin();

  if (!userId) redirect('/login');

  if (!isAdmin) {
    return (
      <main className="min-h-dvh bg-paper text-ink px-6 py-16 max-w-lg mx-auto">
        <h1 className="text-2xl font-black">관리자 전용</h1>
        <p className="mt-2 text-sm text-muted font-semibold">
          이 페이지에 접근할 권한이 없어요.
        </p>
        {needsSetup && (
          <div className="mt-6 rounded-2xl bg-white border border-navy/10 p-5 text-sm leading-relaxed">
            <p className="font-black text-navy mb-2">관리자 설정 방법</p>
            <p className="text-muted">
              아직 관리자가 한 명도 지정되지 않았어요. 아래 둘 중 하나로 권한을 부여하세요.
            </p>
            <ol className="mt-3 list-decimal pl-5 space-y-2 text-[13px]">
              <li>
                Vercel 환경변수 <code className="font-mono bg-navy/5 px-1 rounded">ADMIN_USER_IDS</code> 에
                아래 내 user id를 추가하고 재배포:
                <div className="mt-1 font-mono text-[11px] bg-navy/5 p-2 rounded break-all">
                  {userId}
                </div>
                {email && (
                  <div className="mt-1 text-muted">
                    또는 <code className="font-mono bg-navy/5 px-1 rounded">ADMIN_EMAILS</code> 에 {email}
                  </div>
                )}
              </li>
              <li>
                Supabase에서 직접:
                <div className="mt-1 font-mono text-[11px] bg-navy/5 p-2 rounded break-all">
                  update public.users set is_admin = true where id = &apos;{userId}&apos;;
                </div>
              </li>
            </ol>
          </div>
        )}
        <Link href="/home" className="mt-6 inline-block text-mint-dark font-extrabold text-sm">
          ← 홈으로
        </Link>
      </main>
    );
  }

  // Admin confirmed — pull stats via service-role (bypasses RLS).
  const admin = await createServerClient({ admin: true });
  const { data: overviewData } = await admin.rpc('admin_overview');
  const ov = (overviewData ?? {}) as Partial<Overview>;

  const { data: purchases } = await admin
    .from('credit_purchases')
    .select('id, package_id, amount, credits, bonus_credits, status, approved_at, created_at')
    .order('created_at', { ascending: false })
    .limit(15)
    .returns<PurchaseRow[]>();

  const { data: signups } = await admin
    .from('users')
    .select('id, nickname, credit_balance, is_admin, created_at')
    .order('created_at', { ascending: false })
    .limit(15)
    .returns<SignupRow[]>();

  const kpis: Array<{ label: string; value: string; sub?: string }> = [
    { label: '총 회원', value: num(ov.users_total), sub: `오늘 +${num(ov.users_today)} · 7일 +${num(ov.users_7d)}` },
    { label: '누적 매출', value: `₩${num(ov.revenue_krw)}`, sub: `오늘 ₩${num(ov.revenue_today_krw)}` },
    { label: '결제 건수', value: num(ov.paid_count) },
    { label: '사주 프로필', value: num(ov.profiles_total), sub: `본인 ${num(ov.profiles_self)}` },
    { label: '채팅 메시지', value: num(ov.chat_messages), sub: `세션 ${num(ov.chat_sessions)}` },
    { label: '정밀 풀이', value: num(ov.interpretations) },
    { label: '궁합', value: num(ov.relations) },
    { label: `${CREDIT_UNIT} 발행`, value: num(ov.credits_issued), sub: `소진 ${num(ov.credits_spent)}` },
    { label: `${CREDIT_UNIT} 잔액 합`, value: num(ov.credit_balance_total) },
  ];

  return (
    <main className="min-h-dvh bg-paper text-ink px-5 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold text-muted">꼬북점 운영</p>
          <h1 className="text-2xl font-black text-navy">관리자 대시보드</h1>
        </div>
        <Link href="/home" className="text-sm font-extrabold text-mint-dark">
          앱으로 →
        </Link>
      </div>

      {/* KPI grid */}
      <section className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-white border border-navy/10 p-4 shadow-[0_8px_20px_rgba(44,62,80,0.05)]">
            <div className="text-xs font-bold text-muted">{k.label}</div>
            <div className="mt-1 text-2xl font-black text-navy tabular-nums">{k.value}</div>
            {k.sub && <div className="mt-0.5 text-[11px] font-bold text-muted">{k.sub}</div>}
          </div>
        ))}
      </section>

      {/* Recent payments */}
      <section className="mt-8">
        <h2 className="text-sm font-black text-navy mb-3">최근 결제</h2>
        <div className="overflow-x-auto rounded-2xl border border-navy/10 bg-white">
          <table className="w-full text-sm">
            <thead className="text-[11px] font-extrabold text-muted bg-navy/5">
              <tr>
                <th className="text-left px-3 py-2">패키지</th>
                <th className="text-right px-3 py-2">금액</th>
                <th className="text-right px-3 py-2">{CREDIT_UNIT}</th>
                <th className="text-center px-3 py-2">상태</th>
                <th className="text-right px-3 py-2">일시</th>
              </tr>
            </thead>
            <tbody>
              {(purchases ?? []).map((p) => (
                <tr key={p.id} className="border-t border-navy/5">
                  <td className="px-3 py-2 font-bold text-navy">{p.package_id}</td>
                  <td className="px-3 py-2 text-right tabular-nums">₩{formatKrw(p.amount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{num(p.credits + p.bonus_credits)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[11px] font-extrabold ${p.status === 'paid' ? 'text-[#27AE60]' : p.status === 'failed' ? 'text-red' : 'text-muted'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-[11px] text-muted">
                    {new Date(p.approved_at ?? p.created_at).toLocaleString('ko-KR')}
                  </td>
                </tr>
              ))}
              {(!purchases || purchases.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted text-sm">아직 결제 내역이 없어요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent signups */}
      <section className="mt-8">
        <h2 className="text-sm font-black text-navy mb-3">최근 가입</h2>
        <div className="overflow-x-auto rounded-2xl border border-navy/10 bg-white">
          <table className="w-full text-sm">
            <thead className="text-[11px] font-extrabold text-muted bg-navy/5">
              <tr>
                <th className="text-left px-3 py-2">닉네임</th>
                <th className="text-right px-3 py-2">{CREDIT_UNIT}</th>
                <th className="text-center px-3 py-2">관리자</th>
                <th className="text-right px-3 py-2">가입일</th>
              </tr>
            </thead>
            <tbody>
              {(signups ?? []).map((u) => (
                <tr key={u.id} className="border-t border-navy/5">
                  <td className="px-3 py-2 font-bold text-navy">{u.nickname ?? '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{num(u.credit_balance)}</td>
                  <td className="px-3 py-2 text-center">{u.is_admin ? '✓' : ''}</td>
                  <td className="px-3 py-2 text-right text-[11px] text-muted">
                    {new Date(u.created_at).toLocaleString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-8 text-[11px] text-muted">
        로그인: {email ?? userId} · 데이터는 실시간 (RLS 우회, service_role)
      </p>
    </main>
  );
}
