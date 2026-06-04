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

// ── 광고 유입 퍼널 (admin_funnel RPC) ──
interface FunnelTotals {
  visitors: number;
  views: number;
  signups: number;
  ad_signups: number;
  onboarded: number;
  activated: number;
  paid: number;
  revenue_krw: number;
}
interface FunnelSourceRow {
  source: string;
  visitors: number;
  signups: number;
  onboarded: number;
  activated: number;
  paid: number;
  revenue_krw: number;
}
interface FunnelCampaignRow {
  campaign: string;
  source: string;
  signups: number;
  onboarded: number;
  activated: number;
  paid: number;
  revenue_krw: number;
}
interface FunnelDailyRow {
  day: string;
  signups: number;
  paid: number;
  revenue_krw: number;
}
interface AdminFunnel {
  range_days: number;
  totals: FunnelTotals;
  by_source: FunnelSourceRow[];
  by_campaign: FunnelCampaignRow[];
  daily: FunnelDailyRow[];
}

function num(v: number | null | undefined): string {
  return new Intl.NumberFormat('ko-KR').format(Number(v ?? 0));
}

/** 안전한 백분율 (분모 0 이면 null → '—'). */
function ratio(n: number | null | undefined, d: number | null | undefined): number | null {
  const dd = Number(d ?? 0);
  if (dd <= 0) return null;
  return (Number(n ?? 0) / dd) * 100;
}
function pctStr(n: number | null | undefined, d: number | null | undefined): string {
  const r = ratio(n, d);
  return r === null ? '—' : `${r.toFixed(1)}%`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
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

  // 광고 퍼널 기간 (7/14/30일). 잘못된 값은 14로.
  const rawDays = Number((await searchParams)?.days);
  const days = [7, 14, 30, 90].includes(rawDays) ? rawDays : 14;

  const [{ data: overviewData }, { data: funnelData }] = await Promise.all([
    admin.rpc('admin_overview'),
    admin.rpc('admin_funnel', { p_days: days }),
  ]);
  const ov = (overviewData ?? {}) as Partial<Overview>;
  const fn = (funnelData ?? null) as AdminFunnel | null;
  const ft = fn?.totals;
  const funnelTop = Math.max(ft?.visitors ?? 0, ft?.signups ?? 0, 1);
  const maxDailySignup = Math.max(1, ...(fn?.daily ?? []).map((d) => d.signups));

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

  // ── Conversion funnel + high-margin contents ──
  // 가입 -> 사주 등록 -> 첫 풀이 -> 첫 결제 단계별 도달률.
  // distinct user_id 카운트는 별도 쿼리로 측정 (overview에는 row count만 있음).
  const [
    { count: usersWithProfile },
    { count: usersWithInterp },
    { count: usersWithComic },
    { count: activeShares },
  ] = await Promise.all([
    admin
      .from('saju_profiles')
      .select('owner_id', { count: 'exact', head: true })
      .eq('relation_type', 'self'),
    admin
      .from('interpretations')
      .select('id', { count: 'exact', head: true }),
    admin
      .from('interpretation_comics')
      .select('id', { count: 'exact', head: true }),
    admin
      .from('saju_shares')
      .select('id', { count: 'exact', head: true })
      .gt('expires_at', new Date().toISOString()),
  ]);

  // 정확한 distinct 카운트는 별도 쿼리 (paid_count로 결제는 covered, 풀이/웹툰은
  // 위 row count로 근사). 가입자 분모 기준 conversion% 계산.
  const totalUsers = Number(ov.users_total ?? 0) || 1; // 0 division 방지
  const profileConv = (Number(usersWithProfile ?? 0) / totalUsers) * 100;
  const interpConv = (Number(usersWithInterp ?? 0) / totalUsers) * 100;
  const paidConv = (Number(ov.paid_count ?? 0) / totalUsers) * 100;
  const arpPaid =
    Number(ov.paid_count ?? 0) > 0
      ? Number(ov.revenue_krw ?? 0) / Number(ov.paid_count ?? 0)
      : 0;

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

      {/* 광고 유입 퍼널 (기간/캠페인) */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-black text-navy">
              페이스북 광고 · 유입 퍼널
            </h2>
            <p className="text-[11px] font-bold text-muted">
              최근 {days}일 · 가입 코호트 기준 (방문은 익명 포함)
            </p>
          </div>
          <div className="flex gap-1">
            {[7, 14, 30].map((d) => (
              <Link
                key={d}
                href={`/admin?days=${d}`}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${
                  days === d
                    ? 'bg-navy text-white'
                    : 'bg-navy/5 text-muted'
                }`}
              >
                {d}일
              </Link>
            ))}
          </div>
        </div>

        {!fn ? (
          <div className="rounded-2xl border border-dashed border-navy/20 bg-white p-5 text-sm font-bold text-muted">
            아직 퍼널 데이터를 불러올 수 없어요. (마이그레이션 17 적용 필요:
            <code className="font-mono text-[11px]"> admin_funnel</code> RPC)
          </div>
        ) : (
          <div className="space-y-4">
            {/* 기간 KPI */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              <MiniKpi label="방문자" value={num(ft?.visitors)} sub={`view ${num(ft?.views)}`} />
              <MiniKpi label="가입" value={num(ft?.signups)} sub={`광고경유 ${num(ft?.ad_signups)}`} />
              <MiniKpi label="사주등록" value={num(ft?.onboarded)} />
              <MiniKpi label="결제" value={num(ft?.paid)} />
              <MiniKpi label="매출" value={`₩${num(ft?.revenue_krw)}`} highlight />
            </div>

            {/* 단계 막대 */}
            <div className="rounded-2xl border border-navy/10 bg-white p-5">
              <FunnelRow label="방문 (익명 포함)" count={ft?.visitors ?? 0} pct={((ft?.visitors ?? 0) / funnelTop) * 100} color="bg-navy/70" />
              <FunnelRow label="가입" count={ft?.signups ?? 0} pct={((ft?.signups ?? 0) / funnelTop) * 100} color="bg-navy" />
              <FunnelRow label="사주 등록" count={ft?.onboarded ?? 0} pct={((ft?.onboarded ?? 0) / funnelTop) * 100} color="bg-mint-dark" />
              <FunnelRow label="활성화 (첫 채팅)" count={ft?.activated ?? 0} pct={((ft?.activated ?? 0) / funnelTop) * 100} color="bg-gold/80" />
              <FunnelRow label="결제" count={ft?.paid ?? 0} pct={((ft?.paid ?? 0) / funnelTop) * 100} color="bg-red" isLast />
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-paper p-3">
                  <p className="text-[10px] font-extrabold text-muted">방문→가입</p>
                  <p className="mt-1 text-lg font-black text-navy tabular-nums">{pctStr(ft?.signups, ft?.visitors)}</p>
                </div>
                <div className="rounded-xl bg-paper p-3">
                  <p className="text-[10px] font-extrabold text-muted">가입→결제</p>
                  <p className="mt-1 text-lg font-black text-navy tabular-nums">{pctStr(ft?.paid, ft?.signups)}</p>
                </div>
                <div className="rounded-xl bg-paper p-3">
                  <p className="text-[10px] font-extrabold text-muted">유료 1인 ARPU</p>
                  <p className="mt-1 text-lg font-black text-navy tabular-nums">
                    ₩{num(ft && ft.paid > 0 ? Math.round(ft.revenue_krw / ft.paid) : 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* 일별 가입 추이 */}
            <div className="rounded-2xl border border-navy/10 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-extrabold text-navy">일별 가입 추이</p>
                <p className="text-[10px] font-bold text-muted">막대=가입 · hover 시 결제·매출</p>
              </div>
              <div className="flex items-end gap-[3px] h-24">
                {(fn.daily ?? []).map((d) => (
                  <div
                    key={d.day}
                    className="flex-1 flex flex-col justify-end"
                    title={`${d.day} · 가입 ${d.signups} · 결제 ${d.paid} · ₩${num(d.revenue_krw)}`}
                  >
                    <div
                      className={`w-full rounded-t ${d.paid > 0 ? 'bg-mint-dark' : 'bg-navy/25'}`}
                      style={{ height: `${Math.max(3, (d.signups / maxDailySignup) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 소스별 */}
            <div>
              <h3 className="text-[12px] font-black text-navy mb-2">소스(utm_source)별</h3>
              <div className="overflow-x-auto rounded-2xl border border-navy/10 bg-white">
                <table className="w-full text-sm">
                  <thead className="text-[11px] font-extrabold text-muted bg-navy/5">
                    <tr>
                      <th className="text-left px-3 py-2">소스</th>
                      <th className="text-right px-3 py-2">방문</th>
                      <th className="text-right px-3 py-2">가입</th>
                      <th className="text-right px-3 py-2">결제</th>
                      <th className="text-right px-3 py-2">매출</th>
                      <th className="text-right px-3 py-2">방문→가입</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(fn.by_source ?? []).map((s) => (
                      <tr key={s.source} className="border-t border-navy/5">
                        <td className="px-3 py-2 font-bold text-navy">{s.source}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{num(s.visitors)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{num(s.signups)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{num(s.paid)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">₩{num(s.revenue_krw)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted">{pctStr(s.signups, s.visitors)}</td>
                      </tr>
                    ))}
                    {(!fn.by_source || fn.by_source.length === 0) && (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-muted text-sm">유입 데이터가 아직 없어요.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 캠페인별 */}
            <div>
              <h3 className="text-[12px] font-black text-navy mb-2">캠페인(utm_campaign)별</h3>
              <div className="overflow-x-auto rounded-2xl border border-navy/10 bg-white">
                <table className="w-full text-sm">
                  <thead className="text-[11px] font-extrabold text-muted bg-navy/5">
                    <tr>
                      <th className="text-left px-3 py-2">캠페인</th>
                      <th className="text-left px-3 py-2">소스</th>
                      <th className="text-right px-3 py-2">가입</th>
                      <th className="text-right px-3 py-2">사주</th>
                      <th className="text-right px-3 py-2">결제</th>
                      <th className="text-right px-3 py-2">매출</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(fn.by_campaign ?? []).map((c) => (
                      <tr key={`${c.campaign}-${c.source}`} className="border-t border-navy/5">
                        <td className="px-3 py-2 font-bold text-navy">{c.campaign}</td>
                        <td className="px-3 py-2 text-muted">{c.source}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{num(c.signups)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{num(c.onboarded)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{num(c.paid)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">₩{num(c.revenue_krw)}</td>
                      </tr>
                    ))}
                    {(!fn.by_campaign || fn.by_campaign.length === 0) && (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-muted text-sm">캠페인 데이터가 아직 없어요.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Conversion Funnel */}
      <section className="mt-8">
        <h2 className="text-sm font-black text-navy mb-3">결제 conversion 깔때기 (누적·전체)</h2>
        <div className="rounded-2xl border border-navy/10 bg-white p-5">
          <FunnelRow
            label="가입자"
            count={Number(ov.users_total ?? 0)}
            pct={100}
            color="bg-navy"
          />
          <FunnelRow
            label="사주 등록 완료"
            count={Number(usersWithProfile ?? 0)}
            pct={profileConv}
            color="bg-mint-dark"
          />
          <FunnelRow
            label="정밀 풀이 1개 이상"
            count={Number(usersWithInterp ?? 0)}
            pct={interpConv}
            color="bg-gold/80"
          />
          <FunnelRow
            label="첫 결제 완료"
            count={Number(ov.paid_count ?? 0)}
            pct={paidConv}
            color="bg-red"
            isLast
          />
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-paper p-3">
              <p className="text-[10px] font-extrabold text-muted">전체 paid conversion</p>
              <p className="mt-1 text-lg font-black text-navy tabular-nums">{paidConv.toFixed(2)}%</p>
            </div>
            <div className="rounded-xl bg-paper p-3">
              <p className="text-[10px] font-extrabold text-muted">유료자 1인 평균 결제</p>
              <p className="mt-1 text-lg font-black text-navy tabular-nums">
                ₩{num(arpPaid)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* High-margin content stats */}
      <section className="mt-6">
        <h2 className="text-sm font-black text-navy mb-3">고마진 콘텐츠 · 바이럴</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-gold/15 via-white to-mint/8 border border-gold/35 p-4">
            <p className="text-[10px] font-extrabold text-[#B58A00]">사주 웹툰</p>
            <p className="mt-1 text-2xl font-black text-navy tabular-nums">
              {num(usersWithComic)}
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-muted">총 생성장</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-mint/15 via-white to-navy/8 border border-mint/35 p-4">
            <p className="text-[10px] font-extrabold text-mint-dark">활성 공유 링크</p>
            <p className="mt-1 text-2xl font-black text-navy tabular-nums">
              {num(activeShares)}
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-muted">만료 전</p>
          </div>
          <div className="rounded-2xl bg-white border border-navy/10 p-4">
            <p className="text-[10px] font-extrabold text-muted">소진/발행 비율</p>
            <p className="mt-1 text-2xl font-black text-navy tabular-nums">
              {Number(ov.credits_issued ?? 0) > 0
                ? `${Math.round(
                    (Number(ov.credits_spent ?? 0) /
                      Number(ov.credits_issued ?? 1)) *
                      100,
                  )}%`
                : '—'}
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-muted">유저 engagement 척도</p>
          </div>
        </div>
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

/** 작은 KPI 타일 (기간 퍼널용). */
function MiniKpi({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        highlight ? 'border-gold/40 bg-gold/10' : 'border-navy/10 bg-white'
      }`}
    >
      <div className="text-[10px] font-bold text-muted">{label}</div>
      <div className="mt-0.5 text-lg font-black text-navy tabular-nums">{value}</div>
      {sub && <div className="text-[10px] font-bold text-muted">{sub}</div>}
    </div>
  );
}

/** Funnel 한 단계 — 가로 막대 + label/count/pct. */
function FunnelRow({
  label,
  count,
  pct,
  color,
  isLast,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
  isLast?: boolean;
}) {
  const pctClamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={isLast ? '' : 'mb-3'}>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[12px] font-extrabold text-navy">{label}</span>
        <span className="text-[11px] font-bold text-muted tabular-nums">
          {new Intl.NumberFormat('ko-KR').format(count)}명 · {pctClamped.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-navy/8 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 ${color} rounded-full transition-all`}
          style={{ width: `${pctClamped}%` }}
        />
      </div>
    </div>
  );
}
